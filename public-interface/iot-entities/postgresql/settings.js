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

var settings = require('./models').settings,
    interpreterHelper = require('../../lib/interpreter/helper'),
    Sequelize = require('sequelize'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').settings();

var parseAccountIdParam = function (accountId) {
    //Sequelize create incorrect query if param is undefined
    if (accountId === undefined) {
        return null;
    }
    return accountId;
};

const Op = Sequelize.Op;

exports.new = function (setting, resultCallback) {
    var settingModel = interpreter.toDb(setting);

    settings.create(settingModel)
        .then(function (res) {
            interpreterHelper.mapAppResults(res, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findByCategory = function (userId, accountId, type, resultCallback) {

    var filter = {
        where: {
            accountId: parseAccountIdParam(accountId),
            type: type,
            [Op.or]: [
                {userId: userId, public: false},
                {public: true}
            ]
        },
        order: [
            ['created', 'ASC']
        ]
    };

    settings.findAll(filter)
        .then(function (settings) {
            interpreterHelper.mapAppResults(settings, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findById = function (userId, accountId, category, settingId, resultCallback) {
    var filter = {
        where: {
            id: settingId,
            accountId: parseAccountIdParam(accountId),
            type: category,
            [Op.or]: [
                {userId: userId, public: false},
                {public: true}
            ]
        }
    };
    settings.findOne(filter)
        .then(function (setting) {
            interpreterHelper.mapAppResults(setting, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.update = function (settingId, data, resultCallback) {
    var filter = {
        where: {
            id: settingId
        },
        returning: true
    };

    var settingModel = interpreter.toDb(data);
    settings.update(settingModel, filter)
        .then(function (setting) {
            if (setting && setting.length > 0) {
                interpreterHelper.mapAppResults(setting[1][0], interpreter, resultCallback);
            } else {
                resultCallback(null);
            }
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.delete = function (settingId, resultCallback) {
    var filter = {
        where: {
            id: settingId
        }
    };
    settings.destroy(filter)
        .then(function (deletedCounter) {
            if (deletedCounter && deletedCounter > 0) {
                resultCallback(null, deletedCounter);
            } else {
                throw new Error('No settings were removed');
            }
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.deleteAllByUser = function (userId, resultCallback) {
    var filter = {
        where: {
            userId: userId
        }
    };
    settings.destroy(filter)
        .then(function (result) {
            resultCallback(null, result);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.deleteAccounts = function (userId, accountId, transaction) {
    var filter = {
        where: {
            userId: userId,
            accountId: accountId
        },
        transaction: transaction
    };
    return settings.destroy(filter);
};

exports.findDefault = function (userId, accountId, type, resultCallback) {
    var filter = {
        where: {
            userId: userId,
            accountId: accountId,
            type: type,
            default: true
        }
    };

    settings.findOne(filter)
        .then(function (setting) {
            interpreterHelper.mapAppResults(setting, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.updateDefault = function (userId, accountId, type, settingId, resultCallback) {
    var filter = {
        where: {
            id: settingId,
            userId: userId,
            accountId: accountId,
            type: type,
            default: true
        },
        returning: true
    };

    settings.update({default: false}, filter)
        .then(function (result) {
            resultCallback(null, result);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};
