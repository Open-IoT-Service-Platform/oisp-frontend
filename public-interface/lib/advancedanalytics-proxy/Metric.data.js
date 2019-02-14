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
var dateUtil;
/**
 * Interface to manage the Metric Payload require by Advances Analytics.
 * @constructor
 */
function Metric () {
    this.accountId = null;
    this.did  = null;
    this.on = dateUtil.newTimeStamp();
    this.count = 0;
    this.data = [];
}

Metric.prototype.dataAsRoot = function (value) {
    var dataTemporal = {
        "cid": value.componentId || value.cid || this.globalCid,
        "on": value.on || this.on,
        "value": value.v || value.value,
        "dataType": value.dataType
    };
    if (value.loc) {
        dataTemporal.loc = value.loc;
    }
    if (value.attributes) {
        dataTemporal.attributes = value.attributes;
    }
    if (value.dataType === "ByteArray" && value.bValue !== undefined) {
        dataTemporal.bValue = value.bValue;
    }
    this.data.push(dataTemporal);
};
Metric.prototype.dataAsArray = function (msg) {
    var l = msg.data.length;
    this.globalCid =  msg.componentId || msg.cid;
    for (var i = 0; i < l; i++) {
        var value = msg.data[i];
        this.dataAsRoot(value);
    }
};

/**
 * This convert the Mesagge at Analitics RT to Adavance Analytics Data Injection Payload
 * @param msg
 * @returns {Metric}
 */
Metric.prototype.prepareDataIngestionMsg= function(msg) {
    this.accountId = msg.accountId || msg.domainId;
    this.did = msg.deviceId;
    this.on = msg.on || this.on;
    this.systemOn = msg.systemOn;
    this.data = [];
    if (Array.isArray(msg.data)) {
        this.dataAsArray(msg);
    } else {
        this.dataAsRoot(msg);
    }
    this.count = this.data.length;
    delete this.globalCid;
    return this;
};

module.exports.init = function (Util) {
    dateUtil = Util;
    return Metric;
};
