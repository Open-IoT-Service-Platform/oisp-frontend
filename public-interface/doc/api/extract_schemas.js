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

const BUILD_FOLDER = "build/"

const args = process.argv;

args.shift();
args.shift();
args.forEach(function(val, index, array){
    if (fs.existsSync(val)){
		try{
		    const file      = fs.readFileSync(val);
		    const json_file = JSON.parse(file);
		    console.log("Processing " + val  + "!");
		    for (const name in json_file){
			json_file[name]["$schema"] = "http://json-schema.org/draft-03/schema";

			const json_file_out = BUILD_FOLDER + path.basename(val, '.json') + "_" + name + ".json"

			fs.writeFileSync(json_file_out, JSON.stringify(json_file[name], null, 2));
		    }
		} catch (err){
		    console.error("Could not parse file " + val + ". Error: ", err);
		}
    } else {
		console.error("Could not open file " + val + "!");
    }
});
