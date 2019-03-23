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
var data = require('../../api/v1/data'),
    errBuilder = require('../../../lib/errorHandler/index').errBuilder,
    httpStatuses = require('../../res/httpStatuses');
const cbor = require('borc');

exports.usage = function(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.status(httpStatuses.OK.code).send();
};

exports.collectData = function (req, res, next) {

    var options = {
        deviceId: req.params.deviceId,
        data: req.body,
        forwarded: req.headers['forwarded'] || false,
        identity: req.identity,
        type: req.tokenInfo.payload.type
    };

    // copy binaryValues back to body.data
    options.hasBinary = false;
    if (req.binaryValues !== undefined) {
        req.binaryValues.forEach((item) => {
            req.body.data[item.index].bValue = item.value.toString("base64");
        });
        delete req.binaryValues;
        options.hasBinary = true;
    }

    data.collectData(options, function(err) {
        if (!err) {
            res.status(httpStatuses.Created.code).send();
        } else {
            next(err);
        }
    });
};

exports.collectDataAdmin = function (req, res, next) {

    var options = {
        deviceId: req.params.deviceId,
        data: req.body,
        forwarded: req.headers['forwarded'],
        gatewayId: req.params.deviceId
    };

    data.collectData(options, function(err) {
        if (!err) {
            res.status(httpStatuses.Created.code).send();
        } else {
            next(err);
        }
    });
};

exports.searchData = function(req, res, next) {
    var searchRequest = req.body;
    var output = req.query.output;
    switch(output){
    case 'csv':
        data.exportToCsv(req.params.accountId, searchRequest, function(err, results) {
            if (!err && results.csv) {
                res.setHeader("Content-Type", "text/csv; charset=utf-8");
                res.status(httpStatuses.OK.code).send(results.csv);
            } else if (err in httpStatuses) {
                if(httpStatuses[err].code === errBuilder.Errors.Generic.InvalidRequest.code) {
                    res.status(httpStatuses[err].code).send(results);
                } else {
                    res.status(httpStatuses[err].code).send();
                }
            } else {
                next(err);
            }
        });
        break;
    case 'email':
        data.sendByEmail(req.params.accountId, searchRequest, function(err, results) {
            if (!err) {
                res.status(httpStatuses.OK.code).send();
            } else if (err in httpStatuses) {
                if(httpStatuses[err].code === errBuilder.Errors.Generic.InvalidRequest.code) {
                    res.status(httpStatuses[err].code).send(results);
                } else {
                    res.status(httpStatuses[err].code).send();
                }
            } else {
                next(err);
            }
        });
        break;
    default:
        data.search(req.params.accountId, searchRequest, function(err, results, isBinary) {
            if (!err) {
                if (isBinary) {
                    res.setHeader('Content-Type', 'application/cbor');
                    results = cbor.encode(results);
                } else {
                    res.setHeader('Content-Type', 'application/json');
                }
                res.status(httpStatuses.OK.code).send(results);
            } else if (err in httpStatuses) {
                if(httpStatuses[err].code === errBuilder.Errors.Generic.InvalidRequest.code) {
                    res.status(httpStatuses[err].code).send(results);
                } else {
                    res.status(httpStatuses[err].code).send();
                }
            } else {
                next(err);
            }
        });
    }
};

exports.firstLastMeasurement = function(req, res, next) {
    var body = req.body;

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    data.firstLastMeasurement(req.params.accountId, body, function(err, results) {
        if (!err) {
            res.status(httpStatuses.OK.code).send(results);
        } else if(err.statusCode && err.statusCode === errBuilder.Errors.Generic.InvalidRequest.code) {
            res.status(errBuilder.Errors.Generic.InvalidRequest.code).send(err);
        } else {
            next(err);
        }
    });
};

exports.aggregatedReport = function(req, res, next) {
    var reportRequest = req.body;

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if(reportRequest.offset === undefined ^ reportRequest.limit === undefined) {
        var err = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest,[errBuilder.Errors.Data.OffsetAndLimitBothOrNoneRequired]);
        res.status(errBuilder.Errors.Generic.InvalidRequest.code).send(err);
    } else {
        data.report(req.params.accountId, reportRequest, function (err, results) {
            if (!err) {
                res.status(httpStatuses.OK.code).send(results);
            } else if(err.statusCode && err.statusCode === errBuilder.Errors.Generic.InvalidRequest.code) {
                res.status(errBuilder.Errors.Generic.InvalidRequest.code).send(err);
            } else {
                next(err);
            }
        });
    }
};

exports.searchDataAdvanced = function(req, res, next) {
    var searchRequest = req.body;

    data.searchAdvanced(req.params.accountId, searchRequest, function(err, results, isBinary) {
        if (!err) {
            if (isBinary) {
                res.setHeader('Content-Type', 'application/cbor');
                results = cbor.encode(results);
            } else {
                res.setHeader('Content-Type', 'application/json');
            }
            res.status(httpStatuses.OK.code).send(results);
        } else if (err in httpStatuses) {
            if(httpStatuses[err].code === errBuilder.Errors.Generic.InvalidRequest.code) {
                res.status(httpStatuses[err].code).send(results);
            } else {
                res.status(httpStatuses[err].code).send();
            }
        } else {
            next(err);
        }
    });
};

exports.getTotals = function(req, res, next){
    var period = req.query.period || 'total';
    data.getTotals(req.params.accountId, period, function(err, results) {
        if (!err) {
            res.status(httpStatuses.OK.code).send(results);
        } else {
            next(err);
        }
    });
};
