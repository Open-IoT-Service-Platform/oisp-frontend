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

// Gets the config for the configName from the OISP_FRONTEND_CONFIG environment variable
// Returns empty object if the config can not be found
var getOISPConfig = (function () {
    if (!process.env.OISP_FRONTEND_CONFIG) {
        return function () { return {}; };
    }
    var frontendConfig = JSON.parse(process.env.OISP_FRONTEND_CONFIG);

    var resolveConfig = function (config, stack) {
        if (!stack) {
            stack = ["OISP_FRONTEND_CONFIG"];
        }
        for (var property in config) {
            if (typeof config[property] === "string" &&
					(config[property].substring(0,2) === "@@" || config[property].substring(0,2) === "%%")) {
                var configName = config[property].substring(2, config[property].length);
                if (!process.env[configName]) {
                    console.log("Config environment variable (" + configName + ") is missing...");
                    config[property] = {};
                } else if (stack.indexOf(configName) !== -1) {
                    console.log("Detected cyclic reference in config decleration: " + configName + ", stopping recursion...");
                    config[property] = {};
                } else {
                    config[property] = JSON.parse(process.env[configName]);
                    stack.push(configName);
                    resolveConfig(config[property], stack);
                    stack.pop();
                }
            }
        }
    };

    resolveConfig(frontendConfig);

    return function(configName) {
        if (!frontendConfig[configName] && frontendConfig[configName] !== false)
        {return {};}
        else {
            console.log(configName + " is set to: " + JSON.stringify(frontendConfig[configName]));
            return frontendConfig[configName];
        }
    };
})();

var grafana_config = getOISPConfig("grafanaConfig"),
    keycloak_config = getOISPConfig("keycloakConfig");

var config = {
    auth: {
        keycloak: {
            keycloakListenerPort: keycloak_config.listenerPort,
            realm: keycloak_config.realm,
            "auth-server-url": keycloak_config["auth-server-url"],
            resource: keycloak_config.resource,
            credentials: {
                secret: keycloak_config.secret
            },
            "ssl-required": keycloak_config["ssl-required"]
        }
    },
    grafana : {
        dataSource: grafana_config.dataSource,
        dataSourceHost: grafana_config.dataSourceHost,
        dataSourcePort: grafana_config.dataSourcePort,
        dataSourceProxyPort: grafana_config.dataSourceProxyPort || 4003
    }
};

module.exports = config;
