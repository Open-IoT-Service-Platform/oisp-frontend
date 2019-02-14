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
var cryptoUtils = require('./../../lib/cryptoUtils'),
    userInteractionTokens = require('./models').userInteractionTokens,
    users = require('./models').users,
    interpreter = require('../../lib/interpreter/postgresInterpreter').userInteractionTokens(),
    Q = require('q');

var TYPE = {
    PASSWORD_RESET: 'password-reset',
    ACTIVATE_USER: 'activate-user'
};

exports.TYPE = TYPE;

exports.findByUserInteractionTokenId = function(id, resultCallback){
    var filter = {
        include: [ {model: users, as: 'user'} ],
        where: {
            id: id
        }
    };
    userInteractionTokens.find(filter)
        .then(function(result) {
            resultCallback(null, interpreter.toApp(result));
        })
        .catch(function(err) {
            resultCallback(err, null);
        });
};

exports.new = function(data, resultCallback){
    // Delete previous tokens
    return Q.nfcall(exports.deleteByUserIdAndType, data.userId, data.type)
        .then(function() {
            data.id =  cryptoUtils.generate(16);
            data.on  = Date.now();

            var dbEntity = interpreter.toDb(data);

            return userInteractionTokens.create(dbEntity)
                .then(function (res) {
                    resultCallback(null, interpreter.toApp(res));
                });
        })
        .catch(function(err) {
            resultCallback(err);
        });
};

exports.deleteByUserIdAndType = function(userId, type, callback){
    var filter = {
        where: {
            userId: userId,
            type: type
        }
    };
    userInteractionTokens.destroy(filter)
        .then(function (deletedCounter) {
            callback(null, deletedCounter);
        })
        .catch(function (err) {
            callback(err);
        });
};

exports.deleteAllByUser = function(userId, callback) {
    var filter = {
        where: {
            userId: userId
        }
    };
    userInteractionTokens.destroy(filter)
        .then(function (deletedCounter) {
            callback(null, deletedCounter);
        })
        .catch(function (err) {
            callback(err);
        });
};
