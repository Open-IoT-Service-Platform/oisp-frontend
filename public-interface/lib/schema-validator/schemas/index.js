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
var device = require('./device.json'),
    deviceComponent = require('./device-component.json'),
    data = require('./data.json'),
    component = require('./component.json'),
    invite = require('./invite.json'),
    account = require('./account.json'),
    user = require('./user.json'),
    command = require('./command.json'),
    authorization = require('./authorization.json'),
    refreshToken = require('./refreshToken.json'),
    test = require('./test.json');

module.exports = {
    account: account,
    device: device,
    deviceComponent: deviceComponent,
    data: data,
    component: component,
    invite: invite,
    command: command,
    user: user,
    authorization: authorization,
    refreshToken: refreshToken,
    test : test
};
