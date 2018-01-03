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

const BUILD_FOLDER = "build/";
const args = process.argv;

const secConfig = require('../../lib/security/config');
var routesConfig = [];
const rolesConfig = secConfig.roles;

args.shift();
args.shift();


/* \brief create API message for provided roles
*  \description will get a list of roles, e.g. ["user", "admin"] and generate a text for the raml file
*  \param roles array of roles which are allowed
*/
function createReplaceString(roles){

    var replaceString = "The following access-roles are authorized for this path: ";
    roles.forEach(function(accessRole, idx, array){
        replaceString += "**" + accessRole + "**";
        if (idx !== array.length - 1){
            replaceString += ", ";
        }
    });
    return replaceString;
}


//process every route entry and process path (according to what authorization.js is doing)
secConfig.routes.forEach(function(i){
    routesConfig.push({
        path: i[0],
        regex: new RegExp("^" + i[0].replace(':accountId', '(.[^/]*)') + "/*$", "i"),
        verb: i[1],
        scope: i[2],
        limit: i[3]
    });
});


/* \description:
*  Go through all files, extract the meta tags, match the scopes and roles and replace them by a description
*  METATAGS are html tags like <meta name="access-roles" path="METHOD:PATH">, e.g. <meta name="access-roles" path="POST:/auth/token">
*  SCOPE is a fine granular access right, e.g. user:create, account:delete. It is defined in lib/security/config/routes.config.js
*  ROLE is an authorization role which grants or denies access to a specific path/.
*  METHOD is GET, PUT, POST, DELETE, ...
*  PATH is the resource path for the API call
*/
args.forEach(function(filename){
    
    //First get the metatags
    //Regexp for detecting and retrieving
    var searchRegexp = new RegExp('<meta.*">',"g");
    console.log("Processing file", filename);
    var fileContent = fs.readFileSync(filename, "utf8");
    var metatags = fileContent.match(searchRegexp);

    //For all PATH/METHOD pairs, check the SCOPE and associated ROLES
    searchRegexp = new RegExp('<meta.+name="access-roles".+path="([A-Z]+):(.+)">');
    
    if (metatags){
        metatags.forEach(function(metatag){
            var methodRoute = searchRegexp.exec(metatag);
            var matchRoute = routesConfig.find(function(i){
                return i.verb === methodRoute[1] && i.regex.test(methodRoute[2]);
            });
            var scope = "";
            if (matchRoute) { scope = matchRoute.scope;}

            //Now the scope is known. map it to all potential roles
            var accessRoles = [];
            function testScope(i){
                return i === scope;
            }
            for (var accessRole in rolesConfig){
                var result = rolesConfig[accessRole].find(testScope);
                if (result && accessRole !== "newuser"){
                    accessRoles.push(accessRole);
                }
            }
            
            //Replace the metatag in the file

            var replaceString = createReplaceString(accessRoles);
            fileContent = fileContent.replace(searchRegexp, replaceString);
        });
    }
    //save file to build directory
    fs.writeFileSync(BUILD_FOLDER + filename, fileContent, "utf8");
});
