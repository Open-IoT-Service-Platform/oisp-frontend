/**
 * Copyright (c) 2014 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var logger = require('../../../lib/logger').init(),
    validator = require('../../../lib/validator');

RegExp.prototype.toJSON = RegExp.prototype.toString;

var STATUS_COLUMN = 'status';
var AND = " AND ",
    DESC = "DESC",
    ASC = "ASC",
    EXISTS = "exists",
    IN = "in",
    ALL = "all",
    EQ = "eq",
    NEQ = "neq",
    LIKE = "like",
    ALL = 'all';


var parseArray = function (array) {
    var result = "";
    if (array && Array.isArray(array)) {
        return array.join("','");
    }
    return result;
};

var escapeValue = function (value) {
    return '"' + value + '"';
};

var parseSinglePredicate = function (predicate, key, query) {

    switch (predicate.operator) {
    case IN:
        if (predicate.value && Array.isArray(predicate.value) && predicate.value.length > 0) {
            query[key] = " in ('" + parseArray(predicate.value) + "')";
        }
        break;
    case ALL:
        if (predicate.value && Array.isArray(predicate.value) && predicate.value.length > 0) {
            if (predicate.value.length === 1) {
                query[key] = " = '" + predicate.value + "'";
            } else {
                //Format predicate.value to postgres array format. Query will return any result only if db column's type is array.
                query[key] = " = '{" + predicate.value + "}'";
            }
        }
        break;
    case LIKE:
        if (predicate.value) {
            query[key] = " like '%" + predicate.value + "%'";
        }
        break;
    case EQ:
        if (predicate.value) {
            query[key] = " = '" + predicate.value + "'";
        }
        break;
    case NEQ:
        if (predicate.value) {
            query[key] = " <> '" + predicate.value + "'";
        }
        break;
    case EXISTS:
        if (predicate.value === true) {
            query[key] = " IS NOT NULL ";
        } else if (predicate.value === false) {
            query[key] = " IS NULL ";
        }
        break;
    default:
    }
};

var parsePredicate = function (criteria, key, query) {

    var predicate = criteria[key];
    parseSinglePredicate(predicate, key, query);
};

var buildQuery = function (query) {
    var columnNames = Object.keys(query);

    if (!columnNames || columnNames.length === 0) {
        return null;
    }

    var result = '';

    for (var i = 0; i < columnNames.length; i++) {
        if (columnNames[i] === STATUS_COLUMN) {
            result += '"' + columnNames[i] + '"::varchar';
        } else {
            result += '"' + columnNames[i] + '"';
        }
        result += query[columnNames[i]];

        if (i < columnNames.length - 1) {
            result += AND;
        }
    }

    return result;
};

var parseQuery = function (criteria) {
    var query = {};
    try {
        Object.keys(criteria).forEach(function (key) {
            parsePredicate(criteria, key, query);
        });
    }
    catch (er) {
        query = null;
    }
    return buildQuery(query);
};

var joinQueries = function (queryFields) {
    if (!queryFields || queryFields.length === 0) {
        return null;
    }

    var result = '';
    for (var i = 0; i < queryFields.length; i++) {
        if (queryFields[i] && queryFields[i] !== "") {
            result += queryFields[i] + AND;
        }
    }

    result = result.slice(0, -(AND.length)); //remove last AND

    logger.debug("Joined query result: " + result);
    return result;
};

var mergeQueries = function (keyQuery, valueQuery, table, isExistOperator) {
    var queryKey = [];
    if (!keyQuery && !valueQuery && !isExistOperator) {
        return null;
    } else {
        var sqlQuery = 'EXISTS (SELECT id FROM ' + table + ' WHERE ';
        if (isExistOperator) {
            if (keyQuery) {
                sqlQuery += keyQuery + AND;
            }
            if (!isExistOperator.value) {
                sqlQuery = ' NOT ' + sqlQuery;
            }
        } else {
            if (keyQuery) {
                sqlQuery += keyQuery + AND;
                if (valueQuery) {
                    sqlQuery += valueQuery + AND;
                }
            } else {
                if (valueQuery) {
                    sqlQuery += valueQuery + AND;
                }
            }
        }

        sqlQuery += ' "deviceId" = "d"."id")';
        queryKey.push(sqlQuery);
    }

    return queryKey;
};

var isExistsOperator = function (property) {
    return (property.operator === EXISTS);
};


var parsePropertiesQuery = function (properties, tableName) {
    if (properties && properties.operator) {
        if (isExistsOperator(properties)) {
            return joinQueries([mergeQueries(null, null, tableName, {value: properties.value}, true)]);
        }

        var queries = "";
        if (properties.operator === IN) {
            queries = 'EXISTS (SELECT "deviceId" FROM ' + tableName + ' GROUP BY "deviceId" HAVING';
            var key_value = "";

            properties.value.map(function (element) {
                for (var key in element) {
                    if (element.hasOwnProperty(key)) {
                        key_value += key + ':' + element[key] + ',';
                    }

                }
            });

            key_value = key_value.slice(0, -1);

            queries += ' array_agg(key || \':\' || value) @>';
            queries += ' \'{' + key_value + '}\' AND "deviceId" = "d"."id")';
            return joinQueries([queries]);
        }
        queries = [];
        if (!validator.isObject(properties.value)) {
            return null;
        }

        Object.keys(properties.value).forEach(function (property) {
            var key = {
                operator: EQ,
                value: property
            };

            var value = {
                operator: properties.operator,
                value: properties.value[property]
            };

            var keyQuery = parseQuery({key: key});
            var valueQuery = parseQuery({value: value});

            var mergedQuery = mergeQueries(keyQuery, valueQuery, tableName, false);
            if (mergedQuery) {
                queries.push(mergedQuery);
            }
        });

        return joinQueries(queries);
    }
    return null;
};

var parseComponentsQuery = function (components, tableName) {
    if (components && components.operator) {

        if (isExistsOperator(components)) {
            return joinQueries([mergeQueries(null, null, tableName, {value: components.value})]);
        }

        if (!validator.isObject(components.value)) {
            return null;
        }

        var queries = [];
        Object.keys(components.value).forEach(function (property) {

            var value = {
                operator: components.operator,
                value: components.value[property]
            };

            var condition = {};

            condition[property] = value;

            var query = parseQuery(condition);

            var mergedQuery = mergeQueries(query, null, tableName);
            if (mergedQuery) {
                queries.push(mergedQuery);
            }
        });

        return joinQueries(queries);
    }
    return null;
};

var parseTagsQuery = function (tags, tableName) {
    if (tags && tags.operator && tags.value !== "" && tags.value.length !== 0) {

        if (isExistsOperator(tags)) {
            return joinQueries([mergeQueries(null, null, tableName, {value: tags.value})]);
        }

        var queries = 'EXISTS (SELECT "deviceId" FROM ' + tableName + ' GROUP BY "deviceId" HAVING';

        var tagValue = tags.value;
        if (Array.isArray(tags.value)) {
            tagValue = tags.value.sort();
        }

        if (tags.operator === LIKE) {
            if (Array.isArray(tags.value)) {
                tagValue = tags.value.join('%');
            }
            queries += ' array_to_string(array_agg(value ORDER BY value),\',\')';
            queries += ' LIKE \'%' + tagValue + '%\' AND "deviceId" = "d"."id")';
        } else {
            var tagOperator = "=";
            switch (tags.operator) {
            case ALL:
                // is contained by
                tagOperator = "<@";
                break;
            case EQ:
                tagOperator = "=";
                break;
            case NEQ:
                tagOperator = "<>";
                break;
            case IN:
                // contains @>
                tagOperator = "@>";
                break;
            case EXISTS:
                tagOperator = "&&";
                break;
            }

            queries += ' array_agg(value ORDER BY value)';
            queries += ' ' + tagOperator;
            queries += ' \'{' + tagValue + '}\' AND "deviceId" = "d"."id")';
        }

        return joinQueries([queries]);
    }

    return null;
};

var parseFilters = function (filters, attributes, callback) {

    var result = {};
    delete filters._;
    if (undefined === filters.limit) {
        result.limit = null;
    } else {
        result.limit = parseInt(filters.limit);
    }

    if (undefined === filters.skip) {
        result.offset = null;
    } else {
        result.offset = parseInt(filters.skip);
    }
    result.where = {};
    if (filters.sort && filters.sort in attributes) {
        var order = filters.order === "desc" ? DESC : ASC;
        result.order = [[attributes[filters.sort].fieldName, order]];
    }
    for (var f in filters) {
        if (f in attributes) {
            try {
                result.where[attributes[f].fieldName] = JSON.parse(filters[f]);
            } catch (ex) {
                result.where[attributes[f].fieldName] = filters[f];
            }
        }
    }
    callback(null, result);
};

var parseFiltersToSql = function (filters, attributes, callback) {

    var queryfilters = '';
    delete filters._;

    if (filters.sort && filters.sort in attributes) {
        var order = filters.order === "desc" ? DESC : ASC;
        queryfilters += (' ORDER BY ' + escapeValue(attributes[filters.sort].fieldName) + order);
    }

    if (filters.limit) {
        queryfilters += (" LIMIT " + parseInt(filters.limit));
    }

    if (filters.skip) {
        queryfilters += (" OFFSET " + parseInt(filters.skip));
    }

    if(queryfilters === '' || queryfilters === undefined){
    	queryfilters = null;
    }
    callback(null, queryfilters);
};

exports.parseFiltersToSql = parseFiltersToSql;
exports.joinQueries = joinQueries;
exports.parsePropertiesQuery = parsePropertiesQuery;
exports.parseTagsQuery = parseTagsQuery;
exports.parseQuery = parseQuery;
exports.parseFilters = parseFilters;
exports.parseComponentsQuery = parseComponentsQuery;
exports.escapeValue = escapeValue;
