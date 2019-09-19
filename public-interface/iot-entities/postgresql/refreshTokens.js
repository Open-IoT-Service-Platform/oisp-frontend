/**
 * Copyright (c) 2019 Intel Corporation
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
    refreshTokens = require('./models').refreshTokens;

exports.new = function(id, expiresAt, type) {
    var filter = {
        where: {
            id: id,
            type: type
        }
    };

    var token = cryptoUtils.generate(16);

    return refreshTokens.destroy(filter).then(() => {
        return refreshTokens.create({
            id: id,
            type: type,
            token: token,
            expiresAt: expiresAt
        }).then(() => { return token; });
    });
};

exports.findByIdAndType = function(id, type) {
    var filter = {
        where: {
            id: id,
            type: type
        }
    };

    return refreshTokens.findOne(filter);
};

exports.findByToken = function(token) {
    var filter = {
        where: {
            token: token
        }
    };

    return refreshTokens.findOne(filter);
};

exports.destroyByToken = function(token) {
    var filter = {
        where: {
            token: token
        }
    };

    return refreshTokens.destroy(filter);
};

exports.destroyByIdAndType = function(id, type) {
    var filter = {
        where: {
            id: id,
            type: type
        }
    };

    return refreshTokens.destroy(filter);
};
