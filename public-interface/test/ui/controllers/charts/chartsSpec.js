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

'use strict';

describe('ChartCtrl', function(){
    var scope,
        rootScope,
        window,
        devicesServiceAPI,
        dataServiceAPI,
        ngTableParams = function(){},
        flash,
        filter,
        interval,
        controllerProvider,
        ctrl;
    var ipCookieMock = {};

    beforeEach(module(function ($provide) {
        $provide.value('ipCookie', ipCookieMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, $window, devicesService, dataService, $filter, $interval) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        window = $window;
        controllerProvider = $controller;
        devicesServiceAPI = devicesService;
        dataServiceAPI = dataService;
        filter = $filter;
        interval = $interval;
        rootScope.i18n = { charts: {
            tour:{ step1: {}},
            refreshRates: {}
        }};
        scope.intro_options = {};
    }));

    it('should change selected menu to "charts"', function(){

        ctrl = controllerProvider('ChartCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $q: {},
            $window: { setTimeout: sinon.spy() },
            devicesService: devicesServiceAPI,
            dataService: dataServiceAPI,
            ngTableParams: ngTableParams,
            flash : {},
            $filter: {},
            $interval: {},
            $modal: {},
            sessionService: {}
        });

        expect(rootScope.page.menuSelected).to.equal('charts');
    });

    it('should load all valid periods', function(){
        angular.extend(rootScope.i18n.charts, {
            "title": "My Charts",
            past10Minutes: "Past 10 minutes",
            pastHour: "Past hour",
            pastDay: "Past day",
            pastWeek: "Past week",
            pastMonth: "Past month",
            pastYear: "Past year",
            custom: "Custom time"
        });

        ctrl = controllerProvider('ChartCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $window: { setTimeout: sinon.spy() },
            $modal: {},
            devicesService: devicesServiceAPI,
            dataService: dataServiceAPI,
            ngTableParams: ngTableParams,
            flash: {}
        });

        scope.search.timePeriods.should.be.ok;
        expect(scope.search.timePeriods[0].text).to.equal(rootScope.i18n.charts.past10Minutes);
        expect(scope.search.timePeriods[1].text).to.equal(rootScope.i18n.charts.pastHour);
        expect(scope.search.timePeriods[2].text).to.equal(rootScope.i18n.charts.pastDay);
        expect(scope.search.timePeriods[3].text).to.equal(rootScope.i18n.charts.pastWeek);
        expect(scope.search.timePeriods[4].text).to.equal(rootScope.i18n.charts.custom);
    });
});
