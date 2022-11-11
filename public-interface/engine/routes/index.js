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

var cors = require('./header/cors').cors,
    devices = require('./devices.v1'),
    users = require('./users.v1'),
    accounts = require('./accounts.v1'),
    health = require('./health/health.v1'),
    data = require("./data.v1"),
    invites = require("./invites.v1"),
    refreshTokens = require("./refreshTokens.v1"),
    component = require('./components.v1'),
    actuator = require('./commands.v1'),
    time = require('./time.v1');

var routes =  {
    devices: devices,
    users: users,
    accounts: accounts,
    health: health,
    data: data,
    invites: invites,
    refreshTokens: refreshTokens,
    component: component,
    actuator: actuator,
    time: time
};

module.exports = {
    cors: cors,
    routes: routes,
    register : function(app) {
        Object.keys(routes).forEach(function (key) {
            var route = routes[key];
            route.register(app);
        });
    }
};
