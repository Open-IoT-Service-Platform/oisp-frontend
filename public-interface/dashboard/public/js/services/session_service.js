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

/* global JwtHelper */

'use strict';
iotServices.factory('sessionService', ['ipCookie', '$q', function(ipCookie, $q){
    var currentAccount;
    var currentAccountDeferred = $q.defer();

    var JWT = 'jwt';
    var JWT_REFRESH = 'jwt_refresh';

    var getStandardExpirationDate = function () {
        return 24 * 60 * 60;
    };

    return {
        getCurrentAccount: function (){
            return currentAccount;
        },

        getCurrentAccountPromise: function() {
            return currentAccountDeferred.promise;
        },

        setCurrentAccount: function(value){
            var old = currentAccount;
            currentAccount = value;
            if(old) {
                currentAccountDeferred = $q.defer();
            }
            currentAccountDeferred.resolve(value);
        },

        getJwt: function () {
            return ipCookie(JWT);
        },

        setJwt: function (jwt) {
            var expirationPeriod;
            try {
                expirationPeriod = (new JwtHelper(jwt)).getExpirationPeriod();
            } catch (err) {
                expirationPeriod = getStandardExpirationDate();
            }
            ipCookie(JWT, jwt, {expires: expirationPeriod, expirationUnit: 'seconds'});
        },

        getRefreshJwt: function() {
            return ipCookie(JWT_REFRESH);
        },

        setRefreshJwt: function(refreshToken) {
            var expirationPeriod;
            try {
                expirationPeriod = (new JwtHelper(refreshToken)).getExpirationPeriod();
            } catch (err) {
                expirationPeriod = getStandardExpirationDate();
            }
            ipCookie(JWT_REFRESH, refreshToken, {expires: expirationPeriod, expirationUnit: 'seconds'});
        },

        clearRefreshJwt: function() {
            ipCookie.remove(JWT_REFRESH);
        },

        clearJwt: function () {
            ipCookie.remove(JWT);
        },
        addAccountIdPrefix : function(url) {
            return this.getCurrentAccountPromise()
                .then(function(account) {
                    return '/accounts/' + account.id + url;
                });
        }
    };
}]);
