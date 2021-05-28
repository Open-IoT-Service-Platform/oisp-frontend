/**
 * Copyright (c) 2021 Intel Corporation
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

const { Client } = require("pg"),
    config = require("../config"),
    postgresProvider = require("../iot-entities/postgresql"),
    devices = postgresProvider.devices,
    keycloak = require('../lib/security/keycloak');

module.exports = async function() {
    if (arguments.length < 1) {
        console.error("Not enough arguments : ", arguments);
        console.log("Usage: node admin removeDeviceKeycloakSession " +
            "[accountId] [deviceId] OR [deviceUID]");
        process.exit(1);
    }

    var deviceUID = arguments[0];
    var device = null;

    if (arguments.length === 2) {
        var accountId = arguments[0];
        var deviceId = arguments[1];
        try {
            device = await devices.findByIdAndAccount(deviceId, accountId);
            deviceUID = device.uid;
        } catch(err) {
            console.error("Error during device lookup: " + err);
            process.exit(1);
        }
    } else {
        try {
            device = await devices.findByDeviceUIDWithAccountId(deviceUID);
        } catch(err) {
            console.error("Error during device lookup: " + err);
            process.exit(1);
        }
    }

    if (!device) {
        console.error('Device not found!');
        process.exit(1);
    }

    const client = new Client({
        user: config.postgres.su_username,
        host: config.postgres.options.replication.write.host,
        database: 'oisp',
        password: config.postgres.su_password,
        port: config.postgres.options.port,
    });

    const query = {
        text: "SELECT user_session_id FROM offline_user_session " +
            "WHERE data LIKE $1;",
        values: ["%" + deviceUID + "%"]
    };

    client.connect().then(() => console.log("Connected")).then(function() {
        console.log("Executing query: ", query.text);
        return client.query(query);
    }).then(res => {
        var sessionIds = res.rows.map(row => row.user_session_id);
        console.log("Deleting active sessions with IDs: " +
            sessionIds.toString());
        var promises = sessionIds.map(id =>
            keycloak.serviceAccount.deleteSession(id));
        return Promise.all(promises).then(() => {
            console.log("Device active sessions deleted successfully!");
            query.text = "DELETE FROM offline_client_session " +
                "WHERE user_session_id = ANY ($1);";
            query.values = [sessionIds];
            console.log("Executing query: ", query.text);
            return client.query(query);
        });
    }).then(() => {
        console.log("Device offline client sessions deleted successfully!");
        query.text = "DELETE FROM offline_user_session WHERE data LIKE $1;";
        query.values = ["%" + deviceUID + "%"];
        console.log("Executing query: ", query.text);
        return client.query(query);
    }).then(() => {
        console.log("Device offline keycloak session deleted successfully!");
        client.end();
        process.exit(0);
    }).catch(err => {
        console.error("Error during session deletion: " + err);
        process.exit(1);
    });
};
