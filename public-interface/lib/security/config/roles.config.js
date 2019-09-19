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

module.exports = {
    anon: [
        "ui:public",
        "api:public",
        "user:create"
    ],
    newuser: [
        "ui:public",
        "api:public",
        "account:create",
        "user:admin",
        "auth:read",
        "auth:refresh"
    ],
    user: [
        "data:read",
        "device:admin",
        "device:read",

        "catalog:read",

        "account:read",
        "account:write",
        "account:create",

        "user:admin",

        "ui:public",
        "api:public",
        "alert:write",
        "alert:read",

        "auth:read",
        "auth:refresh"
    ],
    admin:[
        "data:read",
        "data:write",
        "device:admin",
        "device:read",

        "catalog:read",

        "account:read",
        "account:admin",
        "account:write",
        "account:create",

        "user:admin",

        "ui:public",
        "api:public",
        "alert:write",
        "alert:read",

        "auth:read",
        "auth:refresh"
    ],
    device:[
        "data:write",
        "data:read",

        "device:read",
        "device:admin",

        "catalog:read",

        "api:public",

        "auth:read",
        "auth:refresh"
    ],
    sysadmin: [
        "user:admin",
        "ui:public",
        "api:public",
        "platform:admin",
        "account:read",
        "catalog:read",

        "auth:read",
        "auth:refresh"
    ],
    system: [
        "alert:write",
        "alert:trigger",
        "data:writeany",

        "data:write",
        "data:read",

        "device:read",
        "device:admin",

        "catalog:read",

        "api:public",
        "auth:read",
        "auth:refresh",
        "rules:admin"
    ]
};
