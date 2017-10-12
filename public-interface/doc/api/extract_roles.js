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
