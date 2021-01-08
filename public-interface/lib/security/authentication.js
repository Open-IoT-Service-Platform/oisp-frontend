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
var express = require('../express-jaeger').express,
    user = require('../../engine/api/v1/users'),
    users = require('./../../iot-entities/postgresql').users,
    schemaValidator = require('./../schema-validator'),
    schemas = require('./../schema-validator/schemas'),
    errBuilder = require('./../errorHandler').errBuilder,
    keycloak = require('./keycloak');

var getCurrentUser = function (req, res, next) {
    if (!req.identity) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.status(errBuilder.Errors.Generic.NotAuthorized.code).send(errBuilder.Errors.Generic.NotAuthorized.message);
    } else {
        user.getUser(req.identity, function (err, us) {
            if (err) {
                next(err);
            } else {
                res.status(200).send(us);
            }
        });
    }
};

var loginWithKeycloak = function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    keycloak.adapter.grantManager.obtainDirectly(username, password)
        .then(grant => {
            var email = grant.access_token.content.email;
            var uid = grant.access_token.content.sub;
            users.findByEmail(email, function(err, user) {
                if (user) {
                    if (user.id !== uid) {
                        console.log("Keycloak user uid and client user uid mismatch for user: " + email);
                        return res.status(errBuilder.Errors.Generic.NotAuthorized.code)
                            .send(errBuilder.Errors.Generic.NotAuthorized.message);
                    }
                }
                return res.status(200).send({
                    token: grant.access_token.token,
                    refreshToken: grant.refresh_token.token,
                    idToken: grant.id_token.token
                });
            });
        }).catch(err => {
            console.log(err);
            res.status(errBuilder.Errors.Generic.NotAuthorized.code)
                .send(errBuilder.Errors.Generic.NotAuthorized.message);
        });
};

var logout = function(req, res) {
    res.status(200).send();
};

module.exports = function (cfg, forceSSL) {
    var app = express();
    app.disable('x-powered-by');
    if(forceSSL){
        app.use(forceSSL);
    }

    app.get('/api/auth/me', getCurrentUser);
    app.get('/auth/me', getCurrentUser);
    app.delete('/auth/me', logout);

    app.post('/auth/local', loginWithKeycloak);

    app.post('/api/auth/token',
        schemaValidator.validateSchema(schemas.authorization.AUTH),
        loginWithKeycloak
    );

    return app;
};
