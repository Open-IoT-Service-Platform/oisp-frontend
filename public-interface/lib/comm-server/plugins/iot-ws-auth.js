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

var xtend = require('xtend'),
    errBuilder  = require("../../errorHandler").errBuilder,
    authorization = require('../../security/authorization');

function handShake(options) {

    return function (socket) {

        var server = this;

        if (!server.$emit) {
            //then is socket.io 1.0
            var Namespace = Object.getPrototypeOf(server.server.sockets).constructor;
            if (!~Namespace.events.indexOf('authenticated')) {
                Namespace.events.push('authenticated');
            }
        }

        var auth_timeout = setTimeout(function () {
            socket.disconnect('unauthorized');
        }, options.timeout || 5000);

        socket.on('authenticate', function (data) {
            clearTimeout(auth_timeout);
            authorization.tokenInfo(data.token, function(decoded) {
                if (!decoded) {
                    return socket.disconnect('unauthorized');
                }

                socket.decoded_token = decoded;
                socket.emit('authenticated');
                if (server.$emit) {
                    server.$emit('authenticated', socket);
                } else {
                    server.server.sockets.emit('authenticated', socket);
                }
            });
        });

    };
}

function authorize(options) {

    options = options || {};

    if (options.handshake) {
        return handShake(options);
    }

    var defaults = {
        success: function(socket, next){
            if (socket.request) {
                next();
            } else {
                next(null, true);
            }
        },
        fail: function(error, socket, next){
            if (socket.request) {
                next(error);
            } else {
                next(null, false);
            }
        }
    };

    var auth = xtend(defaults, options);

    return function(socket, next){
        var token, error;
        var req = socket.request || socket;
        var authorization_header = (req.headers || {}).authorization;

        if (authorization_header) {
            var parts = authorization_header.split(' ');
            if (parts.length === 2) {
                var scheme = parts[0],
                    credentials = parts[1];

                if (/^Bearer$/i.test(scheme)) {
                    token = credentials;
                }
            } else {
                error = errBuilder.build(errBuilder.Errors.Generic.NotAuthorized, ['Format is Authorization: Bearer [token]']);
                return auth.fail(error, socket, next);
            }
        }

        //get the token from query string
        if (req._query && req._query.token) {
            token = req._query.token;
        }
        else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            error = errBuilder.build(errBuilder.Errors.Generic.NotAuthorized, ['No Authorization header was found']);
            return auth.fail(error, socket, next);
        }

        authorization.tokenInfo(token, null, function(decoded_token) {

            if (!decoded_token) {
                error = errBuilder.build(errBuilder.Errors.Generic.NotAuthorized, ['invalid_token']);
                console.log("Authentication Failed");
                return auth.fail(error, socket, next);
            }

            socket.decoded_token = decoded_token.payload;

            auth.success(socket, next);
        });
    };

}

exports.authorize = authorize;
