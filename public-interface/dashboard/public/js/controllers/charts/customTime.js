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

/*global async*/

'use strict';
iotController.controller('CustomTimeModalCtrl', function (  $scope,
    $window,
    $timeout,
    $modalInstance,
    currentFilter,
    dataService) {

    var now = new Date();
    $scope.dates = {
        from: {
            date : now,
            time: now
        },
        to: {
            date : now,
            time : now
        },
        minDate: new Date(0),
        maxDate: now
    };


    $scope.hours_step = 1;
    $scope.minutes_step = 1;

    $scope.dateOptions = {
        formatYear: 'yy',
        startingDay: 1
    };

    var components = [];
    for(var i = 0; i < currentFilter.metrics.length; i+=1) {
        components.push(currentFilter.metrics[i].id);
    }

    var setDateLimits = function(oldest, newest) {
        $scope.dates.from.date = oldest;
        $scope.dates.from.time = new Date(oldest.getTime());
        $scope.dates.minDate = new Date(oldest.getTime());
        $scope.dates.to.date = newest;
        $scope.dates.to.time = new Date(newest.getTime());
        $scope.dates.maxDate = new Date(newest.getTime());
    };

    var initializeMinMaxTSs = function() {
        dataService.firstLastMeasurementTimestamp(components,
            function(data) {
                var newest = new Date(0),
                    oldest = new Date();
                async.each(data.componentsFirstLast,
                    function(componentFirstLast, callback) {
                        if (componentFirstLast.firstPointTS < oldest.getTime()) {
                            oldest = new Date(componentFirstLast.firstPointTS);
                        }
                        if (componentFirstLast.lastPointTS > newest.getTime()) {
                            newest = new Date(componentFirstLast.lastPointTS);
                        }
                        callback(null);
                    }, function() {
                        setDateLimits(oldest, newest);
                    }
                );
            },
            function(data) {
                $scope.error = data;
                var oldest = new Date(0),
                    newest = new Date();
                setDateLimits(oldest, newest);
            });
    };

    $scope.setStartDateToMinDate = function() {
        $scope.dates.from.date = $scope.dates.minDate;
        $scope.dates.from.time = $scope.dates.minDate;
    };

    $scope.setEndDateToMaxDate = function() {
        $scope.dates.to.date = $scope.dates.maxDate;
        $scope.dates.to.time = $scope.dates.maxDate;
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    if(currentFilter.metrics.length > 0) {
        initializeMinMaxTSs();
    } else {
        $scope.error = $scope.i18n.charts.customTimePeriodValidation.noComponents;
    }

    $scope.setCustomTimePeriod = function() {
        var period = {
            from: $scope.dates.from.date,
            to: $scope.dates.to.date
        };
        period.from.setHours($scope.dates.from.time.getHours());
        period.from.setMinutes($scope.dates.from.time.getMinutes());
        period.to.setHours($scope.dates.to.time.getHours());
        period.to.setMinutes($scope.dates.to.time.getMinutes());

        $scope.error = "";
        if (period.to.getTime() < period.from.getTime()) {
            $scope.error += $scope.i18n.charts.customTimePeriodValidation.wrongDatesOrder;
        }
        if ($scope.error.length === 0) {
            $modalInstance.close(period);
        }
    };
});
