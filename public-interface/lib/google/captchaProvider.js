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
    config = require('../../config'),
    PATH = '/google/captchakey';


var getCaptchaPublicKey = function(req, res) {
    if (!config.auth || !config.auth.captcha || config.auth.captcha.enabled === false) {
        res.status(404).send();
    } else {
        res.status(200).send({
                captchaPublicKey : config.auth.captcha.publicKey
            }
        );
    }
};

module.exports = function() {
    var app = express();
    app.disable('x-powered-by');

    app.get(PATH, getCaptchaPublicKey);


    return app;
};

module.exports.getCaptchaPublicKey = getCaptchaPublicKey;
