/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2012 Ofer Reichman
 *
 * Portions Copyright (c) 2014 Intel Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/

var formats = require('./formats').formats;
var common = require('./common'),
    getType = common.getType,
    prettyType = common.prettyType,
    isOfType = common.isOfType,
    getName = common.getName,
    deepEquals = common.deepEquals;

var validateSchema;

function throwInvalidValue(names, value, expected, errors) {
    errors.push({property: getName(names), message: ' is ' + value + ' when it should be ' + expected});
}

function throwInvalidAttributeValue(names, attribFullName, value, expected, errors) {
    errors.push({
        property: getName(names),
        message: attribFullName + ' is ' + value + ' when it should be ' + expected
    });
}

function throwInvalidType(names, value, expected, errors) {
    errors.push({
        property: getName(names),
        message: ' is ' + prettyType(getType(value)) + ' when it should be ' + expected
    });
}

function throwInvalidDisallow(names, value, expected, errors) {
    errors.push({
        property: getName(names),
        message: ' is ' + prettyType(getType(value)) + ' when it should not be ' + expected
    });
}

function validateRequired(obj, schema, names, errors) {
    //console.log('***', names, 'validateRequired');
    if (schema.required) {
        if (obj === undefined) {
            //throw new Error('JSON object' + getName(names) + ' is required');
            errors.push({property: getName(names), message: 'is required.'});
        }
    }
}

function applyDefault(obj, schema) {
    //console.log('***', names, 'applyDefault');
    if (schema.default !== undefined) {
        obj = schema.default;
    }

    return obj;
}

function validateType(obj, schema, names, errors) {
    //console.log('***', names, 'validateType');
    if (schema.type !== undefined) {
        switch (getType(schema.type)) {
        case 'string':
            // simple type
            if (!isOfType(obj, schema.type)) {
                throwInvalidType(names, obj, prettyType(schema.type), errors);
            }
            break;
        case 'array':
            // union type
            for (var i = 0; i < schema.type.length; ++i) {
                switch (getType(schema.type[i])) {
                case 'string':
                    // simple type (inside union type)
                    if (isOfType(obj, schema.type[i])) {
                        return; // success
                    }
                    break;
                case 'object':
                    // schema (inside union type)
                    try {
                        return validateSchema(obj, schema.type[i], names, errors);
                    } catch (err) {
                        // validation failed
                        // TOOD: consider propagating error message upwards
                    }
                    break;
                }
            }
            throwInvalidType(names, obj, 'either ' + schema.type.map(prettyType).join(' or '), errors);
            break;
        }
    }
}

function validateDisallow(obj, schema, names, errors) {
    if (schema.disallow !== undefined) {
        switch (getType(schema.disallow)) {
        case 'string':
            // simple type
            if (isOfType(obj, schema.disallow)) {
                throwInvalidDisallow(names, obj, prettyType(schema.disallow), errors);
            }
            break;
        case 'array':
            // union type
            for (var i = 0; i < schema.disallow.length; ++i) {
                switch (getType(schema.disallow[i])) {
                case 'string':
                    // simple type (inside union type)
                    if (isOfType(obj, schema.disallow[i])) {
                        throwInvalidType(names, obj, 'neither ' + schema.disallow.map(prettyType).join(' nor '), errors);
                    }
                    break;
                case 'object':
                    // schema (inside union type)
                    try {
                        validateSchema(obj, schema.disallow[i], names, errors);
                    } catch (err) {
                        // validation failed
                        continue;
                    }
                    throwInvalidType(names, obj, 'neither ' + schema.disallow.map(prettyType).join(' nor '), errors);
                    // TOOD: consider propagating error message upwards
                    break;
                }
            }
            break;
        }
    }
}

function validateEnum(obj, schema, names, errors) {
    //console.log('***', names, 'validateEnum');
    if (getType(obj) !== 'null') {
        if (schema['enum'] !== undefined) {
            for (var i = 0; i < schema['enum'].length; ++i) {
                if (deepEquals(obj, schema['enum'][i])) {
                    return;
                }
            }
            errors.push({property: getName(names), message: ' is not in enum'});
        }
    }
}

function validateArray(obj, schema, names, errors) {
    //console.log('***', names, 'validateArray');
    var i, j;

    if (schema.minItems !== undefined) {
        if (obj.length < schema.minItems) {
            throwInvalidAttributeValue(names, 'number of items', obj.length, 'at least ' + schema.minItems, errors);
        }
    }

    if (schema.maxItems !== undefined) {
        if (obj.length > schema.maxItems) {
            throwInvalidAttributeValue(names, 'number of items', obj.length, 'at most ' + schema.maxItems, errors);
        }
    }

    if (schema.items !== undefined) {
        switch (getType(schema.items)) {
        case 'object':
            // all the items in the array MUST be valid according to the schema
            for (i = 0; i < obj.length; ++i) {
                obj[i] = validateSchema(obj[i], schema.items, names.concat(['[' + i + ']']), errors);
            }
            break;
        case 'array':
            // each position in the instance array MUST conform to the schema in the corresponding position for this array
            var numChecks = Math.min(obj.length, schema.items.length);
            for (i = 0; i < numChecks; ++i) {
                obj[i] = validateSchema(obj[i], schema.items[i], names.concat(['[' + i + ']']), errors);
            }
            if (obj.length > schema.items.length) {
                if (schema.additionalItems !== undefined) {
                    if (schema.additionalItems === false) {
                        throwInvalidAttributeValue(names, 'number of items', obj.length, 'at most ' + schema.items.length + ' - the length of schema items', errors);
                    }
                    for (; i < obj.length; ++i) {
                        obj[i] = validateSchema(obj[i], schema.additionalItems, names.concat(['[' + i + ']']), errors);
                    }
                }
            }
            break;
        }
    }

    if (schema.uniqueItems !== undefined) {
        for (i = 0; i < obj.length - 1; ++i) {
            for (j = i + 1; j < obj.length; ++j) {
                if (deepEquals(obj[i], obj[j])) {
                    errors.push({
                        property: getName(names),
                        message: ' items are not unique: element ' + i + ' equals element ' + j
                    });
                }
            }
        }
    }
}

function validateObject(obj, schema, names, errors) {
    //console.log('***', names, 'validateObject');
    if (schema.maxProperties !== undefined) {
        if (Object.keys(obj).length > schema.maxProperties) {
            throwInvalidAttributeValue(names, 'number of properties', Object.keys(obj).length, 'at most ' + schema.maxProperties, errors);
        }
    }

    if (schema.minProperties !== undefined) {
        if (Object.keys(obj).length < schema.minProperties) {
            throwInvalidAttributeValue(names, 'number of properties', Object.keys(obj).length, 'at least ' + schema.minProperties, errors);
        }
    }

    var prop, property;
    if (schema.properties !== undefined) {
        for (property in schema.properties) {
            prop = validateSchema(obj[property], schema.properties[property], names.concat([property]), errors);
            if (prop === undefined) {
                delete obj[property];
            } else {
                obj[property] = prop;
            }
        }
    }

    var matchingProperties = {};
    if (schema.patternProperties !== undefined) {
        for (var reStr in schema.patternProperties) {
            var re = new RegExp(reStr);
            for (property in obj) {
                if (property.match(re)) {
                    matchingProperties[property] = true;
                    prop = validateSchema(obj[property], schema.patternProperties[reStr], names.concat(['patternProperties./' + property + '/']), errors);
                    if (prop === undefined) {
                        delete obj[property];
                    } else {
                        obj[property] = prop;
                    }
                }
            }
        }
    }

    if (schema.additionalProperties !== undefined) {
        for (property in obj) {
            if (schema.properties !== undefined && property in schema.properties) {
                continue;
            }
            if (property in matchingProperties) {
                continue;
            }
            // additional
            if (schema.additionalProperties === false) {
                errors.push({
                    property: getName(names.concat([property])),
                    message: ' is not explicitly defined and therefore not allowed'
                });
            }
            obj[property] = validateSchema(obj[property], schema.additionalProperties, names.concat([property]), errors);
        }
    }

    if (schema.dependencies !== undefined) {
        for (property in schema.dependencies) {
            switch (getType(schema.dependencies[property])) {
            case 'string':
                // simple dependency
                if (property in obj && !(schema.dependencies[property] in obj)) {
                    errors.push({
                        property: getName(names.concat([schema.dependencies[property]])),
                        message: ' is required by property \'' + property + '\''
                    });
                }
                break;
            case 'array':
                // simple dependency tuple
                for (var i = 0; i < schema.dependencies[property].length; ++i) {
                    if (property in obj && !(schema.dependencies[property][i] in obj)) {
                        errors.push({
                            property: getName(names.concat([schema.dependencies[property][i]])),
                            message: ' is required by property \'' + property + '\''
                        });
                    }
                }
                break;
            case 'object':
                // schema dependency
                validateSchema(obj, schema.dependencies[property], names.concat(['[dependencies.' + property + ']']), errors);
                break;
            }
        }
    }
}

function validateNumber(obj, schema, names, errors) {
    //console.log('***', names, 'validateNumber');

    if (schema.minimum !== undefined) {
        if (schema.exclusiveMinimum ? obj <= schema.minimum : obj < schema.minimum) {
            throwInvalidValue(names, obj, (schema.exclusiveMinimum ? 'greater than' : 'at least') + ' ' + schema.minimum, errors);
        }
    }

    if (schema.maximum !== undefined) {
        if (schema.exclusiveMaximum ? obj >= schema.maximum : obj > schema.maximum) {
            throwInvalidValue(names, obj, (schema.exclusiveMaximum ? 'less than' : 'at most') + ' ' + schema.maximum, errors);
        }
    }

    if (schema.divisibleBy !== undefined) {
        if (!isOfType(obj / schema.divisibleBy, 'integer')) {
            throwInvalidValue(names, obj, 'divisible by ' + schema.divisibleBy, errors);
        }
    }
}

function validateString(obj, schema, names, errors) {
    //console.log('***', names, 'validateString');
    if (schema.minLength !== undefined) {
        if (obj.length < schema.minLength) {
            throwInvalidAttributeValue(names, 'length', obj.length, 'at least ' + schema.minLength, errors);
        }
    }

    if (schema.maxLength !== undefined) {
        if (obj.length > schema.maxLength) {
            throwInvalidAttributeValue(names, 'length', obj.length, 'at most ' + schema.maxLength, errors);
        }
    }

    if (schema.pattern !== undefined) {
        if (!obj.match(new RegExp(schema.pattern))) {
            errors.push({property: getName(names), message: ' does not match pattern'});
        }
    }
}

function validateFormat(obj, schema, names, errors) {
    //console.log('***', names, 'validateFormat');
    if (schema.format !== undefined) {
        var format = formats[schema.format];
        if (format !== undefined) {
            var conforms = true;
            if (format.regex) {
                conforms = obj.match(format.regex);
            } else if (format.func) {
                conforms = format.func(obj);
            }
            if (!conforms) {
                errors.push({
                    property: getName(names),
                    message: ' does not conform to the \'' + schema.format + '\' format'
                });
            }
        }
    }
}

function validateItem(obj, schema, names, errors) {
    //console.log('***', names, 'validateItem');
    switch (getType(obj)) {
    case 'number':
    case 'integer':
        validateNumber(obj, schema, names, errors);
        break;
    case 'string':
        validateString(obj, schema, names, errors);
        break;
    }

    validateFormat(obj, schema, names, errors);
}

function validateSchema(obj, schema, names, errors) {
    validateRequired(obj, schema, names, errors);
    if (obj === undefined) {
        obj = applyDefault(obj, schema);
    }
    if (obj !== undefined) {
        validateType(obj, schema, names, errors);
        validateDisallow(obj, schema, names, errors);
        validateEnum(obj, schema, names, errors);

        switch (getType(obj)) {
        case 'object':
            validateObject(obj, schema, names, errors);
            break;
        case 'array':
            validateArray(obj, schema, names, errors);
            break;
        default:
            validateItem(obj, schema, names, errors);
        }
    }
    return obj;
}

//the main function
module.exports = function (obj, schema) {
    var errors = [];
    validateSchema(obj, schema, [], errors);
    return {errors: errors};
};
