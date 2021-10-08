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

"use strict";
var jwt_decode = require('jwt-decode'),
    express = require('./../express-jaeger').express,
    utils = require('./utils'),
    keycloak = require('./keycloak'),
    users = require('./../../iot-entities/postgresql').users,
    logger = require('./../logger').init(),
    tokenTypes;

var generateToken = function(deviceUID, deviceId, activationcode, type, callback, email, expire) {
    if ((!deviceUID || !activationcode) && !email) {
        callback("Can't create token, not enough information.");
    }
    var headers = {};
    keycloak.serviceAccount.ensureServiceAccountGrant().then(grant => {
        if (expire) {
            headers["X-Token-Expire"] = "" + expire;
        }
        if (email) {
            keycloak.customGrants.impersonateUser(grant.access_token.token, email, headers)
                .then(grant => {
                    callback(null, {
                        token: grant.access_token,
                        refreshToken: grant.refresh_token
                    });
                });
        } else {
            if (type === tokenTypes.device) {
                headers["X-Access-Type"] = type;
                headers["X-DeviceID"] = deviceId;
                headers["X-Activation-Code"] = activationcode;
                headers["X-DeviceUID"] = deviceUID;
            }
            keycloak.customGrants.impersonateUser(grant.access_token.token, keycloak.placeholdermail, headers)
                .then(grant => {
                    callback(null, {
                        token: grant.access_token,
                        refreshToken: grant.refresh_token
                    });
                }).catch(err => {
                    callback(err);
                });
        }
    }).catch(err => {
        callback(err);
    });
};

module.exports.decodeToken = function(token) {
    return jwt_decode(token);
};

var getTokenInfo = function(token, req, callback){
    var decoded = jwt_decode(token);
    return keycloak.adapter.grantManager.createGrant({ access_token: token }).then(grant => {
        var tokenInfo = {
            header: grant.access_token.header,
            payload: decoded
        };
        if (req) {
            req.identity = decoded.sub;
            req.tokenInfo = tokenInfo;
            logger.debug("Decoded token: " + JSON.stringify(req.tokenInfo));
        }
        return callback(tokenInfo);
    }).catch((err) => {
        logger.debug("Error when decoding token: " + err);
        return callback(null);
    });
};

var checkUser = function(token) {
    return users.findById(token.sub).then(user => {
        if (user && user.id) {
            return true;
        }
        return false;
    });
};

var addUserToDB = function(token) {
    var userData = {
        id: token.sub,
        email: token.email
    };
    return users.new(userData);
};

var parseTokenFromRequest = function(req, res, next) {
    var accessToken = utils.getBearerToken(req.headers.authorization);
    var decoded = {};
    if (accessToken) {
        try {
            decoded = jwt_decode(accessToken);
        } catch (err) {
            logger.error('Error occured in token parsing: ' + err);
            return next();
        }
        req.identity = decoded.sub;
        req.tokenInfo = {
            payload: decoded
        };
        if (!Object.keys(tokenTypes).some(type => tokenTypes[type] === decoded.type)) {
            logger.error('Invalid Token Type: ' + decoded.type + ' for user: ' + decoded.sub);
            req.identity = null;
            req.tokenInfo = null;
            return next();
        }
        keycloak.adapter.grantManager.createGrant({ access_token: accessToken }).then(grant => {
            keycloak.adapter.storeGrant(grant, req, res);
            req.tokenInfo.header = grant.access_token.header;
            return checkUser(decoded);
        }).then(isInDB => {
            if (!isInDB) {
                return addUserToDB(decoded);
            }
            return Promise.resolve();
        }).then(() => {
            next();
        }).catch(err => {
            logger.debug("Non-critical error occured in token parsing: " + err);
            next();
        });
    } else {
        next();
    }
};

module.exports.generateToken = generateToken;

module.exports.tokenInfo = getTokenInfo;

module.exports.middleware = function(secConfig, forceSSL){
    var app = express();
    if(forceSSL){
        app.use(forceSSL);
    }
    app.disable('x-powered-by');

    tokenTypes = secConfig.tokenTypes;
    module.exports.tokenTypes = tokenTypes;

    app.use(parseTokenFromRequest);

    app.get("/api/auth/tokenInfo", function(req, res){
        res.status(200).send(req.tokenInfo);
    });

    return app;
};
