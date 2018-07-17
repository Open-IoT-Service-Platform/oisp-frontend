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
var uuid = require('node-uuid'),
    User = require('../../engine/api/v1/users'),
    UserType = require('../../iot-entities/postgresql/users').USER_TYPES,
    logger = require('../logger').init(),
    jsjws = require('jsjws'),
    keyPem = require('./key-pem'),
    defaultTokenExpire,
    userTokenExpire,
    iss,
    alg,
    supportedAlg,
    routesConfig = [],
    rolesConfig = {},
    publicRoutes = [],
    express = require('express'),
    accountIdRex = new RegExp("/api/accounts/(.[^/]*)"),
    utils = require('./utils'),
    errBuilder = require('./../errorHandler').errBuilder;

var generateToken = function(subjectId, accounts, role, expire, callback){
    var expireSeconds = expire || defaultTokenExpire;
    var expireDate = new Date((new Date()).getTime() + expireSeconds);

    var header = {
        typ:"JWT",
        alg: alg
    };

    var payload = {
        jti: uuid.v4(),
        iss: iss,
        sub: subjectId,
        exp: expireDate,
        accounts: accounts
    };

    if (role && role === UserType.system) {
        payload.userRole = UserType.system;
        payload.exp = new Date((new Date()).getTime() + defaultTokenExpire);
    }

    logger.debug('Generated token valid until ' + payload.exp);

    callback(null, new jsjws.JWS().generateJWSByKey(header, payload, keyPem.priv_key()));
};

function findDeletedAccounts(tokenAccounts, accountIds){
    var accountsArray = [];


    var isId = function (element) {
        return element === i;
    };

    for(var i in tokenAccounts){
        if(!accountIds.some(isId)){
            accountsArray.push({
                id: i,
                name: "",
                role: tokenAccounts[i]
            });
        }
    }
    return accountsArray;
}

var getTokenInfo = function(token, req, callback){
    var jws = new jsjws.JWS();
    try {
        jws.verifyJWSByKey(token, keyPem.pub_key(), supportedAlg);

        var header = jws.getParsedHeader();
        var payload = jws.getParsedPayload();
    	var expireDate = new Date(payload.exp);

        if(new Date() > expireDate){
            callback();
        } else {
        	var timestamp = expireDate.getTime();
        	payload.exp = timestamp;
            var result = {
                header: header,
                payload: payload
            };
            if (req) {

                req.identity = payload.sub;
                req.tokenInfo = {
                    header: header,
                    payload: payload
                };

                User.getUser(req.identity, function(err, user) {
                    if (!err) {
                        result.accounts = [];// user.accounts;
                        if (user.accounts && typeof user.accounts === 'object') {
                            var accountIds = Object.keys(user.accounts);
                            if(!accountIds.length){
                                result.accounts = req.tokenInfo.payload.accounts;
                                return callback(result);
                            }
                            req.tokenInfo.payload.accounts = findDeletedAccounts(req.tokenInfo.payload.accounts, accountIds);
                            accountIds.map(function (accountId) {
                                    var account = user.accounts[accountId];
                                    if(typeof account !== 'object'){
                                        account = {
                                            name:"",
                                            role: account
                                        };
                                    }
                                    req.tokenInfo.payload.accounts.push({
                                        id: accountId,
                                        name: account.name,
                                        role: account.role
                                    });
                            });
                            result.accounts = req.tokenInfo.payload.accounts;
                            callback(result);
                        } else {
                            logger.warn('User ' + req.identity + ' not found when checking token info.');
                            callback(null);
                        }
                    } else {
                        callback(result);
                    }
                });

            } else {
                callback(result);
            }

        }
    }catch(e){
        console.log(e)
        logger.error("Failed to verify JWS token");
        callback();
    }
};

var getAccountRole = function(accountId, tokenPayload){

    if (tokenPayload && tokenPayload.userRole === UserType.system) {
        return UserType.system;
    }

    if(!accountId){
        return null;
    }

    for(var i in tokenPayload.accounts){
        if(tokenPayload.accounts[i].id === accountId){
            return tokenPayload.accounts[i].role;
        }
    }
    return tokenPayload.accounts[accountId] || 'anon';
};

var getAccountId = function(path, body, tokenAccounts) {
    var accountId = accountIdRex.exec(path);
    if (accountId) {
        accountId = accountId[1];
    } else {
        accountId = !body ? null : body.accountId ? body.accountId : body.domainId ? body.domainId : null;
    }
    if (!accountId) {
        if (tokenAccounts && tokenAccounts.length === 1) {
            accountId = tokenAccounts[0].id;
        }
    }
    return accountId;
};

var isAllowed = function(req, callback) {
    var requestPath = req.path

    if(publicRoutes.some(function(i){
        return req.method === i.verb &&
            i.path === requestPath;
    })){
        callback(true);
    } else {
        getTokenInfo(utils.getBearerToken(req.headers.authorization), req, function(tokenInfo){
            var role = 'anon';
            if (tokenInfo) {
                var accountId = getAccountId(req.path, req.body, tokenInfo.payload.accounts);
                role = getAccountRole(accountId, tokenInfo.payload);
                if (!role) {
                    role = 'newuser';
                }
            }
            logger.debug("role is: " + role);
            callback(routesConfig.some(function (i) {
                return i.verb === req.method &&
                i.regex.test(req.path) &&
                rolesConfig[role].some(function (j) {
                        return i.scope === j;
                    });
            }));
        });
    }
};

module.exports.isAdminForAccountInUri = function(req, userId, callback)
{
    getTokenInfo(utils.getBearerToken(req.headers.authorization), req, function(tokenInfo){
        var isSelf = (!tokenInfo) ? false : tokenInfo.payload.sub === userId;
        var accountId = getAccountId(req.path, req.body);
        var role = (!tokenInfo) ? null :
                (!tokenInfo.payload.accounts) ? 'user' :
                getAccountRole(accountId, tokenInfo.payload);
        var res = accountIdRex.exec(req.path);
        if(!res) {
            callback(role === 'admin', isSelf);
        } else {
            callback(role === 'admin', isSelf, res[1]);
        }
    });
};

var authorizeRoute = function (req, res, next) {
    isAllowed(req, function(allowed){
        if(allowed){
            next();
        } else {
            if (req.path.indexOf('/api/') === 0) {
                res.status(errBuilder.Errors.Generic.NotAuthorized.code).send(errBuilder.Errors.Generic.NotAuthorized.message);
            } else {
                res.redirect('/');
            }
        }
    });
};

module.exports.generateToken = generateToken;

module.exports.getAuthToken = function(options) {
    return function(req, res, next) {
        if (!req.user) {
            res.status(errBuilder.Errors.Generic.NotAuthorized.code).send(errBuilder.Errors.Generic.NotAuthorized.message);
        } else {
            generateToken(req.user.id, req.user.accounts, req.user.type, userTokenExpire,
                function(err, token){
                    if(!err){
                        if(options && options.followRedirect) {
                            res.redirect('/ui/auth#/login/success?jwt='+encodeURIComponent(token));
                        } else {
                            res.status(200).send({
                                token: token
                            });
                        }
                    } else {
                        next(err);
                    }
                }
            );
        }
    };
};

module.exports.deleteAuthToken = function(req, res){
    if(req.tokenInfo && req.tokenInfo.payload){
        res.status(200).send();
    } else {
        res.status(401).send();
    }
};

module.exports.tokenInfo = getTokenInfo;

module.exports.middleware = function(secConfig, forceSSL){
    var app = express();
    if(forceSSL){
        app.use(forceSSL);
    }
    app.disable('x-powered-by');

    secConfig.routes.forEach(function(i){
        routesConfig.push({
            path: i[0],
            regex: new RegExp("^" + i[0].replace(':accountId', '(.[^/]*)') + "/*$", "i"),
            verb: i[1],
            scope: i[2],
            limit: i[3]
        });
    });
    rolesConfig = secConfig.roles;
    if(rolesConfig.anon) {
        rolesConfig.anon.forEach(function(i){
            routesConfig.filter(function(j){
                return j.scope === i;
            }).forEach(function(k) {
                publicRoutes.push(k);
            });
        });
    }

    keyPem.init(secConfig);

    defaultTokenExpire = secConfig.default_token_expire * 60 * 1000;
    userTokenExpire = secConfig.user_token_expire * 60 * 1000;
    alg = secConfig.alg;
    iss = secConfig.iss;
    supportedAlg = secConfig.supportedAlg;

    app.use(authorizeRoute);

    app.get("/api/auth/tokenInfo", function(req, res){
       res.status(200).send(req.tokenInfo);
    });

    return app;
};
