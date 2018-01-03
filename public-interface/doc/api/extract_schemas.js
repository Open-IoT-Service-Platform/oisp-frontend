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
/*jshint esnext: true */

"use strict";
const fs = require('fs');
const path = require('path');

const BUILD_FOLDER = "build/";

const args = process.argv;

args.shift();
args.shift();
args.forEach(function(val){
    if (fs.existsSync(val)){
                try{
                    const file      = fs.readFileSync(val);
                    const jsonFile = JSON.parse(file);
                    console.log("Processing " + val  + "!");
                    for (var name in jsonFile){
                        jsonFile[name]["$schema"] = "http://json-schema.org/draft-03/schema";

                        const jsonFileOut = BUILD_FOLDER + path.basename(val, '.json') + "_" + name + ".json";

                        fs.writeFileSync(jsonFileOut, JSON.stringify(jsonFile[name], null, 2));
                    }
                } catch (err){
                    console.error("Could not parse file " + val + ". Error: ", err);
                }
    } else {
                console.error("Could not open file " + val + "!");
    }
});
