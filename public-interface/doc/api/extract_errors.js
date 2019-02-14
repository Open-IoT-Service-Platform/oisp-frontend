#!/usr/bin/env node
/*
 Copyright (c) 2017 Intel Corporation

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

"use strict";
const fs = require('fs');
const errors = require("../../engine/res/errors.js");
const yaml = require('json2yaml');

const BUILD_FOLDER = "build/";

// \brief sorts array-touple according to status code, groups elements with same status and writes it to a raml compliant file
function writeRamlFromArray(array, prefix)
{
    var responses = {};

    array.sort(function(a,b){
        return a[1].status - b[1].status;
    });

    for(var i in array){
        var status = array[i][1].status;
        if (!responses[status]){
            responses[status] = {};
        }
        var description = array[i][0];
        if (!responses[status]["description"]){
            responses[status]["description"] = description;
        }
        else {
            responses[status]["description"] += " or " + description;
        }

        var example = array[i][0];
        if (!responses[status]["body"]){
            responses[status]["body"] = {};
        }
        if (!responses[status]["body"]["examples"]){
            responses[status]["body"]["examples"] = {};
        }
        if (!responses[status]["body"]["examples"][example]){
            responses[status]["body"]["examples"][example] = {};
        }
        responses[status]["body"]["examples"][example] = JSON.stringify(array[i][1]).replace(/\"([^(\")"]+)\":/g,"$1:");
    }
    const content = yaml.stringify({responses: responses});
    const ramlFileOut = BUILD_FOLDER + "errors_" + prefix + ".raml";
    fs.writeFileSync(ramlFileOut, content);
}


// \brief recurse through error object, create list of errors sorted by error codes.
// \description Creating raml files from json error file, e.g. taking
//   Errors: {
//         Generic: {
//             InvalidRequest: {code: 400, status: 400, message: "Invalid request"},
//             InvalidData: {code: 1400, status: 400, message: "Device has some invalid data"},
//             NotAuthorized: {code: 401, status: 401, message: "Not Authorized"},
//             RateLimit: {code: 429, status: 429, message: "Too many requests"},
//             InternalServerError: {code: 500, status: 500, message: "Internal Server Error"},
//             AnalyticsError: {code: 999, status: 502, message: "Error contacting backend service"}
//         }
//  }
// and create:
// errors_Generic.raml:
// responses:
//   400:
//     description: InvalidRequest or InvalidData
//     body:
//       application/json:
//         examples:
//           InvalidRequest: |
//             {code: 400, status: 400, message: "Invalid request"}
//           InvalidData:
//             {code: 1400, status: 400, message: "Device has some invalid data"}
//   401:
//     description: NotAuthorized
//     body:
//       application/json:
//         examples:
//           NotAuthorized: |
//             NotAuthorized: {code: 401, status: 401, message: "Not Authorized"}
//   ...
// \params errors the error-object
// \params prefix prefix for filename
function recurseAndWriteRaml(errors, prefix){
    var array = [];
    for (var message in errors){
        if (errors[message].code) {
            array.push([message, errors[message]]);
        }
        else{
            // recurse into next level
            recurseAndWriteRaml(errors[message], prefix + "_" + message);
        }
    }
    writeRamlFromArray(array, prefix);
}


for (var prop in errors.Errors){
    console.log("Processing ", prop);
    recurseAndWriteRaml(errors.Errors[prop], prop);
}
