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

var helper = require('./helper');

exports.formatDeviceAttributes = function (attributes, deviceId) {
    return Object.keys(attributes).map(function (key) {
        return {
            key: key,
            value: attributes[key],
            deviceId: deviceId
        };
    });
};

exports.formatDeviceTags = function (tags, deviceId) {
    return tags.map(function (tag) {
        return {
            value: tag,
            deviceId: deviceId
        };
    });
};

var formatDeviceComponentRow = function (columns) {
    return '"(' + columns.join() + ')"';
};

exports.formatDeviceComponents = function (components) {
    var rows = components.map(function (component) {
        return formatDeviceComponentRow([component.cid, component.name, component.type, component.deviceId]);
    });
    return '{' + rows.join() + '}';
};

exports.getIdsFromQueryResult = function (devices) {
    var ids = [];
    if (devices && Array.isArray(devices)) {
        ids = devices.map(function (device) {
            return device.id;
        });
    }
    return ids;
};

exports.formatAddComponentsResult = function (result) {

    var tagsParser = function(row, tags) {
        if (row.id) {
            tags[row.id] = {
                value: row.value
            };
        }
    };

    var attributesParser = function(row, attributes) {
        if (row.id) {
            attributes[row.id] = {
                key: row.key,
                value: row.value
            };
        }
    };

    var componentsParser = function(row, components) {
        if (row.componentId) {
            components[row.componentId] = {
                dataValues: {
                    componentId: row.componentId,
                    name: row.name,
                    deviceId: row.deviceId,
                    componentType: {
                        dataValues: {
                            componentTypeId: row.componentType.componentTypeId,
                            accountId: row.componentType.accountId,
                            dimension: row.componentType.dimension,
                            version: row.componentType.version,
                            type: row.componentType.type,
                            dataType: row.componentType.dataType,
                            format: row.componentType.format,
                            min: row.componentType.min,
                            max: row.componentType.max,
                            measureunit: row.componentType.measureunit,
                            display: row.componentType.display,
                            default: row.componentType.default,
                            icon: row.componentType.icon,
                        }
                    }
                }
            };
        }
    };

    var device = null;

    if (result) {
        device = {
            id: result.id,
            gatewayId: result.gatewayId,
            accountId: result.accountId,
            name: result.name,
            loc: result.loc,
            description: result.description,
            status: result.status,
            components: helper.parseCollection(result.deviceComponents, componentsParser),
            tags: helper.parseCollection(result.tags, tagsParser),
            attributes: helper.parseCollection(result.attributes, attributesParser)
        };
    }
    return device;
};

exports.createTotalsResponse = function (statistics) {
    return {
        state: {
            active: {
                total: statistics.activeDevices
            },
            created: {
                total: statistics.createdDevices
            },
            total: statistics.createdDevices + statistics.activeDevices

        },
        total: statistics.allDevices,
        current: statistics.currentDevices
    };
};
