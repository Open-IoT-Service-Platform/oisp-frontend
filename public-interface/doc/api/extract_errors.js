#!/usr/bin/env node

/*
Copyright (c) 2017, Intel Corporation

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

"use strict";
const fs = require('fs');
const path = require('path');
const errors = require("../../engine/res/errors.js");
const yaml = require('json2yaml');

const BUILD_FOLDER = "build/"

// \brief sorts array-touple according to status code, groups elements with same status and writes it to a raml compliant file
function write_raml_from_array(array, prefix)
{
    var responses = {};

    array.sort(function(a,b){
		return a[1].status - b[1].status;
    });
    
    for(var i in array){
		var status = array[i][1].status;
		if (!responses[status])
		    responses[status] = {};
		
		var description = array[i][0];
		if (!responses[status]["description"])
		    responses[status]["description"] = description;
		else
		    responses[status]["description"] += " or " + description;
		
		var example = array[i][0];
		if (!responses[status]["body"])
		    responses[status]["body"] = {};
		if (!responses[status]["body"]["examples"])
		    responses[status]["body"]["examples"] = {};
		if (!responses[status]["body"]["examples"][example])
		    responses[status]["body"]["examples"][example] = {}
		responses[status]["body"]["examples"][example] = JSON.stringify(array[i][1]).replace(/\"([^(\")"]+)\":/g,"$1:");
    }
    const content = yaml.stringify({responses});
    const raml_file_out = BUILD_FOLDER + "errors_" + prefix + ".raml";
    fs.writeFileSync(raml_file_out, content);
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
function recurse_and_write_raml(errors, prefix){
    var array = [];
    for (var message in errors){
		if (errors[message].code) {
		    array.push([message, errors[message]]);
		}
		else{
		    // recurse into next level
		    recurse_and_write_raml(errors[message], prefix + "_" + message);
		}
    }
    write_raml_from_array(array, prefix);
}


for (var prop in errors.Errors){
    console.log("Processing ", prop);
    recurse_and_write_raml(errors.Errors[prop], prop);
}
