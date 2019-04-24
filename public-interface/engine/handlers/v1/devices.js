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
var devices = require('../../api/v1/devices'),
    Response = require('../../../lib/response').response,
    httpStatuses = require('../../res/httpStatuses'),
    errors = require('../../../lib/errorHandler/index').errBuilder.Errors,
    errBuilder = require('../../../lib/errorHandler/index').errBuilder,
    auth = require('../../../lib/security/authorization'),
    logger = require('../../../lib/logger/index').init(),
    schemaValidator = require('../../../lib/schema-validator'),
    schemas = require('../../../lib/schema-validator/schemas'),
    attributesValidation = require('../helpers/attributesValidation'),
    requestParser = require('../helpers/requestParser'),
    Q = require('q');

exports.usage = function (req, res, next) {
    var responder = new Response(res, next);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    responder(httpStatuses.OK.code);
};

exports.getDevices = function (req, res, next) {
    var accountId = requestParser.getAccountIdFromReq(req);
    var responder = new Response(res, next);
    var queryParameters = req.query;

    if (!accountId) {
        responder(errBuilder.build(errors.Generic.NotAuthorized));
        return;
    }
    devices.getDevices(accountId, queryParameters, function (err, devices) {
        responder(httpStatuses.OK.code, devices);
    });
};

exports.deleteDevice = function (req, res, next) {
    var accountId = requestParser.getAccountIdFromReq(req);

    var responder = new Response(res, next);

    devices.deleteDevice(req.params.deviceId, accountId, function (err) {
        if (!err) {
            responder(httpStatuses.DeleteOK.code);
        } else {
            responder(err);
        }
    });
};

exports.addDevice = function (req, res, next) {
    var accountId = requestParser.getAccountIdFromReq(req);
    var responder = new Response(res, next);
    if (!accountId) {
        responder(errBuilder.build(errors.Generic.NotAuthorized));
        return;
    }
    var data = req.body;
    attributesValidation.checkLimitsForAttributes(data.attributes, function (err) {
        if (!err) {
            devices.addDevice(data, accountId, function (err, result) {
                if (!err) {
                    responder(httpStatuses.Created.code, result);
                } else {
                    responder(err);
                }
            });
        } else {
            responder(httpStatuses.BadRequest.code, err);
        }
    });
};

exports.updateDevice = function (req, res, next) {
    var device = req.body,
        deviceId = req.params.deviceId;

    var accountId = requestParser.getAccountIdFromReq(req);
    var responder = new Response(res, next);
    if (!accountId) {
        logger.debug("devices.updateDevice, accountId param not found.");
        responder(errBuilder.build(errors.Generic.NotAuthorized));
        return;
    }
    return Q.nfcall(attributesValidation.checkLimitsForAttributes, device.attributes)
        .then(function () {
            return devices.updateDevice(deviceId, device, accountId)
                .then(function (result) {
                    responder(httpStatuses.OK.code, result);
                })
                .catch(function (err) {
                    responder(err);
                });
        })
        .catch(function (err) {
            responder(httpStatuses.BadRequest.code, err);
        });
};
exports.getDevice = function (req, res, next) {
    var accountId = requestParser.getAccountIdFromReq(req);
    var responder = new Response(res, next);
    if (!accountId) {
        responder(errBuilder.build(errors.Generic.NotAuthorized));
        return;
    }

    devices.getDevice(req.params.deviceId, accountId, function (err, foundDevice) {
        if (!err) {
            responder(httpStatuses.OK.code, foundDevice);
        } else {
            responder(err);
        }
    });
};

exports.activateNewDevice = function (req, res, next) {
    var device = {
        deviceId: req.params.deviceId
    };

    var activationCode = req.body.activationCode;
    var responder = new Response(res, next);

    devices.registerDevice(device, activationCode, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};


/* Refresh device (session) token */
exports.refreshDeviceToken = function (req, res, next) {

    var responder = new Response(res, next);
    var device = {
        deviceId: req.params.deviceId
    };

    devices.refreshDeviceToken(device, req.body.deviceRefreshToken, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};


exports.registerDevice = function (req, res, next) {
    var activationCode = req.body.activationCode,
        device = req.body.device;

    var responder = new Response(res, next);

    devices.registerDevice(device, activationCode, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

function getFiltersQueryParametersForRequest(req) {
    var filters = req.body;
    var queryParameters = req.query !== undefined ? req.query : [];

    filters['accountId'] = { operator: "eq", value: req.params.accountId };
    return {
        "filters": filters,
        "queryParameters": queryParameters
    };
}

exports.searchDevices = function (req, res, next) {
    var searchQuery = getFiltersQueryParametersForRequest(req);
    var responder = new Response(res, next);

    devices.findByCriteria(searchQuery.filters, searchQuery.queryParameters, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

exports.countDevices = function (req, res, next) {
    var searchQuery = getFiltersQueryParametersForRequest(req);
    var responder = new Response(res, next);

    devices.countByCriteria(searchQuery.filters, searchQuery.queryParameters, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, {device: {total: result}});
        } else {
            responder(err);
        }
    });
};

exports.getTags = function (req, res, next) {
    var responder = new Response(res, next);
    devices.getTags(req.params.accountId, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

exports.getAttributes = function (req, res, next) {
    var responder = new Response(res, next);
    devices.getAttributes(req.params.accountId, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

exports.getComponents = function (req, res, next) {
    var responder = new Response(res, next);
    devices.getComponents(req.params.accountId, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

exports.getComponentsByCustomFilter = function (req, res, next) {
    var responder = new Response(res, next);
    devices.getComponentsByCustomFilter(req.params.accountId, req.body, function (err, result) {
        if (!err) {
            responder(httpStatuses.OK.code, result);
        } else {
            responder(err);
        }
    });
};

exports.getDeviceTotals = function (req, res, next) {
    var responder = new Response(res, next);
    devices.getDeviceTotals(req.params.accountId, function (err, result) {
        responder(httpStatuses.OK.code, result);
    });
};

exports.deleteComponent = function (req, res, next) {
    var accountId = requestParser.getAccountIdFromReq(req);
    var responder = new Response(res, next);

    return devices.deleteComponent(req.params.deviceId, req.params.componentId, accountId).
        then(function () {
            responder(httpStatuses.DeleteOK.code);
        })
        .catch(function (err) {
            responder(err);
        });
};
exports.addComponents = function (req, res, next) {

    var addComponentLogic = function () {
        var responder = new Response(res, next);

        auth.isAdminForAccountInUri(req, req.identity, function (isAdmin, isSelf, accountId) {
            var deviceId = req.params.deviceId;
            accountId = requestParser.getAccountIdFromReq(req);
            if (accountId && (isAdmin || deviceId === req.identity)) {
                devices.addComponents(deviceId, req.body, accountId)
                    .then(function (result) {
                        logger.info("Success Add Component To device " + JSON.stringify(result));
                        responder(httpStatuses.Created.code, result);
                    })
                    .catch(function (err) {
                        logger.error("Not Add Components to Device" + JSON.stringify(err));
                        responder(err);
                    });
            } else {
                responder(errBuilder.build(errors.Generic.NotAuthorized));
                return;
            }
        });
    };

    var schema = schemas.deviceComponent.SINGLE;
    if (Array.isArray(req.body)) {
        schema = schemas.deviceComponent.MULTI;
    }
    schemaValidator.validateSchema(schema)(req, res, function (err) {
        if (!err) {
            addComponentLogic();
        } else {
            next(err);
        }
    });
};
