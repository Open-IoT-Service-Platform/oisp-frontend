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
iotController.controller('HomeCtrl', function($scope,
    $modal,
    pollerService,
    devicesService,
    usersService,
    dataService,
    sessionService,
    $q) {


    var i18n = $scope.$parent.i18n;
    $scope.Object = Object;
    $scope.$parent.page = {
        menuSelected: "board",
        title : i18n.dashboard.title
    };
    $scope.devices = {
        total :0,
        current: 0
    };
    $scope.series = {
        devices : [],
        messages : [
            {
                x: parseInt(new Date()/1000),
                y: 0
            }
        ]
    };

    $scope.deviceSummary = devicesService.data;
    $scope.dataSummary = dataService.data;

    function addTo(name) {
        var a = $scope[name];
        $scope.series[name] = a.current;
    }

    function getPercentage(total, current) {
        var a = 0;
        if (total > 0) {
            a = parseInt((current / total) * 100);
        }
        return a;
    }

    $scope.$watch('deviceSummary.device', function(dataTotals){
        if (dataTotals) {
            $scope.healthDevices = getPercentage(dataTotals.total, dataTotals.current);
            $scope.devices = dataTotals;
            addTo('devices');
        }
    }, true);

    function hideloading () {
        $scope.isLoadingDataSummary = false;
    }

    function getMessagesTotal() {
        if($scope.dashboardConfig && $scope.dashboardConfig.data && $scope.dashboardConfig.data.messages){
            if(sessionService.getCurrentAccount()) {
                dataService.getTotal($scope.dashboardConfig.data.messages.period, hideloading);
            }
        }
    }

    $scope.$watch('dashboardConfig.data.messages.period', function(){
        $scope.isLoadingDataSummary = true;
        $scope.dataSummary.total = 0;
        getMessagesTotal();
    });

    function saveDashboardConfig() {
        var id = $scope.dashboardConfig.id;
        var data = {
            value: $scope.dashboardConfig.data,
            public: false
        };
        usersService.updateUserSetting(sessionService.getCurrentAccount().id, 'dashboard', id, data, function () {

        }, function(data) {
            $scope.error = data.message || data;
        });
    }

    $scope.selectMessagesPeriod = function(period){
        $scope.dashboardConfig.data.messages.period = period;
        saveDashboardConfig();
    };

    $scope.$on('$destroy', function iVeBeenDismissed() {
        pollerService.stopPolling('dataTotals');
        pollerService.stopPolling('deviceTotals');
    });
    $scope.$on('$viewContentLoaded', function readyToTrick() {
        $scope.$watch(sessionService.getCurrentAccount, function(data) {
            if (data) {
                pollerService.startPolling('deviceTotals', devicesService.getTotal);
                pollerService.startPolling('dataTotals', getMessagesTotal);
            } else {
                pollerService.stopPolling('dataTotals');
                pollerService.stopPolling('deviceTotals');
            }
        });
    });

    $scope.alert_title = "Active Alerts";
    var ModalAlertInstanceCtrl = function ($scope, $modalInstance, alert_title) {
        $scope.alert_title = alert_title;
        $scope.close = function () {
            $modalInstance.close();
        };
    };
    $scope.showAlerts = function (button) {
        var modalInstance = $modal.open({
            templateUrl: 'public/partials/rules/showAlerts.html',
            controller: ModalAlertInstanceCtrl,
            resolve: {
                alert_title: function () {
                    return button.toUpperCase() + " : " + $scope.alert_title;
                }
            }
        });
        return modalInstance;
    };

    function createDashboardConfig(callback) {
        var initialSetting = {
            value: {
                chart: {
                    filter: ""
                },
                messages: {
                    period: 'last_hour'
                }
            },
            public: false
        };
        usersService.addUserSettings(sessionService.getCurrentAccount().id, 'dashboard', initialSetting, function (data) {
            callback(data);
        });
    }

    var dataCanceler;

    function refreshWidget() {
        if($scope.dashboardConfig && $scope.availableFilters && $scope.dashboardConfig.data.chart){
            var filter = $scope.availableFilters.filter(function(item){
                return item.id === $scope.dashboardConfig.data.chart.filter;
            })[0];

            if(filter && filter.value) {
                $scope.inProgress = true;
                document.body.style.cursor = 'wait';
                if (dataCanceler) {
                    dataCanceler.resolve();
                }
                dataCanceler = $q.defer();

                var searchFilter = {
                    from: filter.value.chart.timePeriod.value,
                    to: undefined,
                    targetFilter: {
                        deviceList: []
                    },
                    metrics: []
                };
                if(filter.value.chart.timePeriod.unit!=='minute'){
                    searchFilter.maxItems = angular.element("#chart_container").width() || 1000;
                }

                Object.keys(filter.value.chart.devices).forEach(function (item) {
                    if (item && filter.value.chart.devices[item]) {
                        searchFilter.targetFilter.deviceList.push(item);
                    }
                });

                Object.keys(filter.value.chart.metrics).forEach(function (item) {
                    if (item && filter.value.chart.metrics[item]) {
                        searchFilter.metrics.push({
                            "id": item,
                            "op": "none"
                        });
                    }
                });

                dataService.search(searchFilter, dataCanceler, function (data) {
                    data.timeUnit = filter.value.chart.timePeriod.unit;
                    data.minMaxLinesAccepted = filter.value.chart.minMaxLinesAccepted;
                    $scope.chartSeries = data;
                    $scope.chartHeight = 290;
                    $scope.renderType = filter.value.chart.renderType.id;
                    $scope.inProgress = false;
                    document.body.style.cursor = 'dafault';

                }, function (data) {
                    var to = parseInt(new Date().getTime());
                    data = {
                        from: to + (filter.value.chart.timePeriod.value * 1000),
                        to: to,
                        timeUnit: filter.value.chart.timePeriod.unit,
                        series: [],
                        minMaxLinesAccepted: filter.value.chart.minMaxLinesAccepted
                    };

                    $scope.chartSeries = data;
                    $scope.inProgress = false;
                    document.body.style.cursor = 'dafault';
                });
            } else {
                $scope.inProgress = false;
            }
        } else {
            $scope.inProgress = false;
        }
    }

    $scope.$watch(sessionService.getCurrentAccount, function(data) {
        if (data) {
            usersService.getUserSettings(data.id, 'favorite', function (data) {
                $scope.availableFilters = data || [];
            }, function () {
                $scope.availableFilters = [];
            });

            usersService.getUserSettings(data.id, 'dashboard', function (data) {
                if (!data || !data[0] || !data[0].value || !data[0].value) {
                    createDashboardConfig(function (data) {
                        $scope.dashboardConfig = {
                            id: data.id,
                            data: data.value
                        };
                    });
                } else {
                    if (angular.isArray(data[0].value.widgets)) {
                        $scope.dashboardConfig = {
                            id: data[0].id,
                            data: {
                                chart: {
                                    filter: data[0].value.widgets[0].filter
                                },
                                messages: {
                                    period: 'last_hour'
                                }
                            }
                        };
                    } else {
                        $scope.dashboardConfig = {
                            id: data[0].id,
                            data: data[0].value
                        };
                    }
                    refreshWidget();
                }
            });
        }
    });

    $scope.selectFilter = function(filter){
        $scope.dashboardConfig.data.chart.filter = filter.id;

        refreshWidget();
        saveDashboardConfig();
    };

    $scope.refreshWidget = refreshWidget;

});
