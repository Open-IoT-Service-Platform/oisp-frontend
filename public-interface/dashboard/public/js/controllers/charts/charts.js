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

/*global angular*/
'use strict';
iotController.controller('ChartCtrl', function( $scope,
                                                $rootScope,
                                                $q,
                                                $window,
                                                dataService,
                                                devicesService,
                                                componentsService,
                                                sessionService,
                                                usersService,
                                                ngTableParams,
                                                flash,
                                                $filter,
                                                $timeout,
                                                $modal) {
    var chartRefreshCancellationToken;

    $scope.chosenTimePeriod = null;
    $scope.componentsTable = {};

    $scope.$parent.page = {
        menuSelected: "charts",
        title: $rootScope.i18n.charts.title
    };
    angular.element('.container').css('width', '100%');

    $scope.activeTab = 'chart';

    $scope.changeActiveTab = function() {
        if($scope.activeTab === 'data') {
            $scope.activeTab = 'chart';
            for(var j = 0; j < $scope.searchResult.metrics.length; j++) {
                if($scope.searchResult.metrics[j].isNumericComponent === false) {
                    $scope.filters.chart.metrics[$scope.searchResult.metrics[j].name] = false;
                }
            }
        } else {
            $scope.activeTab = 'data';
        }
        $scope.selectMetric();
    };

    $scope.$watch(sessionService.getCurrentAccount, function(acc) {
        if (acc) {
            devicesService.getTags(function(data){
                $scope.tags = data;
            }, function(data){
                $scope.error = data.message || data;
                $scope.tags = [];
            });
            if($scope.currentUser.accounts[$scope.currentAccount.id] &&
                $scope.currentUser.accounts[$scope.currentAccount.id].role === 'admin') {
                usersService.getUsers();
            } else {
                usersService.getUser($scope.currentUser.id, function(data){
                    usersService.data.userList = [ data ];
                });
            }
            componentsService.getFullCatalog(function(data) {
                $scope.componentsTable = data;
            });
        } else{
            $scope.tags = [];
        }
    });

    $scope.queryTags = function(){
        return $scope.tags;
    };

    $scope.searchResult = {
        "metrics": [],
        "devices": []
    };

    $scope.status = {
        inProgress: false
    };

    $scope.search = {
        name:"",
        labels: [],
        property: null,
        timePeriods: [
            {id:1, text:$scope.i18n.charts.past10Minutes, value:-600, unit:"minute"},
            {id:2, text:$rootScope.i18n.charts.pastHour, value:-3600, unit:"minute"},
            {id:3, text:$rootScope.i18n.charts.pastDay, value:-24*3600, unit:"hour"},
            {id:4, text:$rootScope.i18n.charts.pastWeek, value:-24*3600*7, unit:"day"},
            {id:5, text:$rootScope.i18n.charts.pastMonth,value:-24*3600*30, unit:"day"},
            {id:6, text:$rootScope.i18n.charts.pastYear,value:-24*3600*365, unit:"month"},
            {id:7, text:$rootScope.i18n.charts.custom,value:-1, unit:"hour"}
        ],
        renderType: {
            line: {id:"line", text:"Line"},
            lineplot: {id:"lineplot", text:"Lineplot"},
            unstackedarea: {id:"unstackedarea", text:"Area"}
        }
    };

    $scope.refreshRates = [
        {text: $rootScope.i18n.charts.refreshRates.refresh5Seconds, seconds: 5},
        {text: $rootScope.i18n.charts.refreshRates.refresh10Seconds, seconds: 10},
        {text: $rootScope.i18n.charts.refreshRates.refresh30Seconds, seconds: 30},
        {text: $rootScope.i18n.charts.refreshRates.refresh60Seconds, seconds: 60},
        {text: $rootScope.i18n.charts.refreshRates.noRefresh, seconds: 31536000} // about 1 year
    ];

    $scope.refreshRateSeconds = 5;

    $scope.filters = {
        chart: {
            renderType: $scope.search.renderType.line,
            timePeriod: $scope.search.timePeriods[1],
            minMaxLinesAccepted: false,
            devices: {},
            metrics: {}
        }
    };

    $scope.isChartRendered = false;
    $scope.lastQueryTimeStamp = 0;

    $scope.$watch('filters.chart.metrics', function() {
        $scope.isChartRendered = false;
        $scope.status.errorLoadingData = false;
        $scope.status.errorLoadingDataReason = '';
        $scope.lastQueryTimeStamp = 0;
    });
    $scope.$watch('[filters.chart.timePeriod, filters.chart.devices, filters.chart.metrics, filters.chart.minMaxLinesAccepted]', function(){
        $scope.searchResult.metrics = [];
        Object.keys($scope.filters.chart.devices).forEach(function(item){
            if($scope.filters.chart.devices[item]){
                var devices = $scope.searchResult.devices.filter(function(device){
                    return device.deviceId === item;
                });

                if(devices && devices[0] && devices[0].components) {
                    devices[0].components.forEach(function (component) {
                        var availableMetric = $scope.searchResult.metrics.filter(function (item) {
                            return item.name === component.name;
                        });
                        var isNumericComponent;
                        for(var i = 0; i < $scope.componentsTable.length; i++) {
                            if($scope.componentsTable[i].id === component.type) {
                                component.format = $scope.componentsTable[i].dataType;
                                if(component.format === 'Number') {
                                    isNumericComponent = true;
                                } else {
                                    isNumericComponent = false;
                                }
                                break;
                            }
                        }
                        if (availableMetric && availableMetric[0]) {
                            availableMetric[0].devices.push(devices[0].name);
                            availableMetric[0].components.push({id: component.cid, type: component.type, format: component.format});
                            if(isNumericComponent === true) {
                                availableMetric[0].isNumericComponent = isNumericComponent;
                            }
                        } else {
                            $scope.searchResult.metrics.push({
                                name: component.name,
                                components: [
                                    {
                                        id: component.cid,
                                        type: component.type,
                                        format: component.format
                                    }
                                ],
                                devices: [devices[0].name],
                                isNumericComponent: isNumericComponent
                            });
                        }
                    });
                }
            }
        });
        $scope.selectMetric();
        $scope.isChartRendered = false;
        $scope.status.errorLoadingData = false;
        $scope.status.errorLoadingDataReason = '';
        $scope.lastQueryTimeStamp = 0;
        if(!$scope.noMetrics()) {
            $scope.renderChart();
        }else{
            angular.element("#legend_container #legend").empty();
        }

        setTimeout(function(){
            $scope.selectMetric();
            $scope.searchResult.metrics.forEach(function(metric){
                var title = "";

                if(metric.devices && metric.devices.length > 0){
                    title=title + $scope.i18n.charts.components;
                    title=title + ":<br/>";
                    title=title + "<ul>";

                    metric.components.forEach(function(component){
                        title=title + "<li>" + component.id + " (" + component.type + ")" +  "</li>";
                    });
                    title=title + "</ul>";
                }

                $("[id='" + "button" + metric.name + "']").tooltip({
                    placement: "right",
                    title: title,
                    html: true
                });
            });
        }, 300);
    }, true);


    $scope.selectPeriod = function(period){
        var customTimeId = 7;
        $scope.filters.chart.timePeriod = period;
        $scope.timeUnit = period.unit;
        if ($scope.filters.chart.timePeriod.unit !== 'minute') {
            flash.to('alert-2').success = $scope.i18n.charts.aggregationInfo;
        }

        if (period.id !== 1) {
            $scope.selectRefreshRate($scope.refreshRates[0].seconds);
        }

        if (period.id === customTimeId) {
            $scope.customTimePeriod();
        }
        else {
            $scope.chosenTimePeriod = null;
        }
    };

    $scope.selectRefreshRate = function(rateSeconds) {
        if(rateSeconds >= 5 && rateSeconds % 1 === 0) {
            $scope.refreshRateSeconds = rateSeconds;
            $scope.restartRefresh();
        }
    };

    var isMinMaxLine = function(legendRow) {
        var text = legendRow.parentNode.innerText;
        return (text.search('max') !== -1 || text.search('min') !== -1);
    };

    var isLegendSerieEnabled = function(legendRow) {
        var className = legendRow.parentNode.className;
        return className.search('disabled') === -1;
    };

    var disableMinMaxLines = function() {
        var legend = $('.action');
        for(var i = 0; i < legend.length; i++) {
            if(isMinMaxLine(legend[i]) && isLegendSerieEnabled(legend[i])) {
                legend[i].click();
            }
        }
    };

    var enableMinMaxLines = function() {
        var legend = $('.action');
        for(var i = 0; i < legend.length; i++) {
            if(isMinMaxLine(legend[i]) && !isLegendSerieEnabled(legend[i])) {
                legend[i].click();
            }
        }
    };



    $scope.selectRenderType = function(renderType) {

        if(renderType.id === $scope.search.renderType.unstackedarea.id) {
            disableMinMaxLines();
        } else if($scope.filters.chart.minMaxLinesAccepted) {
            enableMinMaxLines();
        }
        $scope.filters.chart.renderType = renderType;
    };

    $scope.toggleMinMax = function(){
        $scope.filters.chart.minMaxLinesAccepted = !$scope.filters.chart.minMaxLinesAccepted;
    };

    $scope.allMetrics= function (metricsAll){
        if($scope.activeTab === 'chart') {
            angular.forEach($scope.searchResult.metrics, function(item){
                if(item.isNumericComponent) {
                    $scope.filters.chart.metrics[item.name] = metricsAll;
                }
            });
        } else {
            angular.forEach($scope.searchResult.metrics, function(item){
                $scope.filters.chart.metrics[item.name] = metricsAll;
            });
        }
    };
    $scope.selectMetric = function (){
        var selectedMetric = $scope.searchResult.metrics.filter(function(item){
            if($scope.filters.chart.metrics[item.name]) {
                return $scope.filters.chart.metrics[item.name] === true;
            }
        });
        var numericMetric = $scope.searchResult.metrics.filter(function(item){
            return item.isNumericComponent;
        });


        if(selectedMetric && $scope.searchResult.metrics){
            if(document.getElementById("selectAllComponents") != null) {
                if($scope.activeTab === 'chart') {
                    document.getElementById("selectAllComponents").checked = (selectedMetric.length === numericMetric.length);
                } else {
                    document.getElementById("selectAllComponents").checked = (selectedMetric.length === $scope.searchResult.metrics.length);
                }
            }
        }
    };

    $scope.noMetrics = function(){
        return !$scope.filters.chart.metrics ||
            !Object.keys($scope.filters.chart.metrics).some(function(item){
                return $scope.filters.chart.metrics[item];
            }) ||
            !$scope.filters.chart.devices ||
                !Object.keys($scope.filters.chart.devices).some(function(item){
                return $scope.filters.chart.devices[item];
            });
    };

    $scope.noData = function(){
        return !$scope.chartSeries || !$scope.chartSeries.series || $scope.chartSeries.series.length === 0;
    };

    
    $scope.showAlert =function(){
        if(typeof $scope.chartSeries === "undefined" ){
            return false;
        }
        $scope.truncatedSeries = [];
        var limit = parseInt($scope.chartSeries.pointsLimit);
        var temp = 0;
        $scope.chartSeries.series.forEach(function (serie) {
            if(temp < serie.points.length) {
                temp = serie.points.length;
            }
            if(serie.points.length >= limit) {
                $scope.truncatedSeries.push(serie.componentName);
            }
        });
        return temp >= limit;
    };

    $scope.chartData = [];
    /*jshint newcap: false */
    $scope.tableChartData = new ngTableParams({
        page: 1,                // show first page
        count: 10,              // count per page
        sorting: {
            timestamp: 'desc'   // set default sorting
        }
    }, {
        counts: [],
        getData: function(deferred, params) {
            var orderedData = !isEmpty(params.sorting()) ?
                $filter('orderBy')($scope.chartData, params.orderBy()) :
                $scope.chartData;

            orderedData = params.filter() ?
                $filter('filter')(orderedData, params.filter()) :
                orderedData;

            var dataForPage = orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());

            deferred.resolve(dataForPage);
            params.total(orderedData.length);
        }
    });

    /*jshint newcap: true */
    var dataCanceler;

    function calculateChartHeight(){
       $scope.chartHeight = 300;
    }

    function getFilters() {
        var filters = {
            from: $scope.filters.chart.timePeriod.value,
            to: $scope.filters.chart.timePeriod.to,
            targetFilter:
            {
                deviceList: []
            },
            metrics: []
        };
        if(filters.from === undefined) {
            filters.from = -600; // Last ten minutes in case value is not specified
        }

        if($scope.filters.chart.timePeriod.unit !== 'minute'){
            filters.maxItems = angular.element("#chartTab").width() || 1000; // default
        }

        Object.keys($scope.filters.chart.devices).forEach(function(item){
            if($scope.filters.chart.devices[item]) {
                filters.targetFilter.deviceList.push(item);
            }
        });

        Object.keys($scope.filters.chart.metrics).forEach(function(item){
            if($scope.filters.chart.metrics[item]) {
                var availableMetric = $scope.searchResult.metrics.filter(function(metric){
                    return metric.name === item;
                });

                if(availableMetric && availableMetric[0]){
                    availableMetric[0].components.forEach(function(component){
                        filters.metrics.push({
                            "id": component.id,
                            "op": "none"
                        });
                    });
                    filters.metrics.push({
                        "id": availableMetric[0].name,
                        "op": "none"
                    });

                }
            }
        });
        return filters;
    }

    $scope.getFilterWithMetricIDs = function(){
        var filters = {};
        angular.copy($scope.filters, filters);

        var metrics = getFilters().metrics;
        Object.keys(filters.chart.metrics).forEach(function(id){
            filters.chart.metrics[id] = false;
        });
        metrics.forEach(function(metric){
            filters.chart.metrics[metric.id] = true;
        });

        return filters;
    };

    function refreshChart() {
        $scope.stopAutoRefresh();

        var promise;
        if($scope.noMetrics()) {
            promise = emptyPromise();
        } else {
            if($scope.isChartRendered) {
                promise = downloadNewData().then(function(data) {
                    return updateChartWithDownloadedData(data);
                });
            } else {
                promise = renderChart();
            }
        }

        promise.finally(function() {
            scheduleRefresh();
        });
    }

    $scope.refreshChart = function(){
        refreshChart();
    };

    var updateChartWithDownloadedData = function(data) {
        data.series.forEach(function(serie) {
            var oldSerie = $scope.chartSeries.series.filter(function(ser) {
                return(ser.componentId === serie.componentId);
            })[0];

            if (oldSerie) {
                var newPoints = oldSerie.points.length > 0 ? serie.points.filter(function(point) {
                    // we only want to add points newer than those already in serie
                    // and serie is ordered, so we can just compare to last point
                    return (point.ts > oldSerie.points[oldSerie.points.length - 1].ts);
                }) : [];
                if(newPoints.length > 0){
                    var latestTimestamp = parseInt(newPoints[newPoints.length-1].ts);
                    var minTimestamp = parseInt(latestTimestamp + $scope.filters.chart.timePeriod.value * 1000);

                    while (oldSerie.points.length > 0) {
                        if(oldSerie.points[0].ts < minTimestamp){
                            oldSerie.points.shift();
                        } else {
                            break;
                        }
                    }
                }
                oldSerie.points = oldSerie.points.concat(newPoints);
            }

        });
    };

    function scheduleRefresh() {
        chartRefreshCancellationToken = $timeout(function() {
            refreshChart();
        }, $scope.refreshRateSeconds * 1000);
    }

    function emptyPromise() {
        return $q.when();
    }

    $scope.status.errorLoadingData = false;
    $scope.status.errorLoadingDataReason = '';

    function renderChart(){     
        if($scope.noMetrics() || $scope.status.inProgress || $scope.status.errorLoadingData ||
            getFilters().metrics.length === 0) {
            return emptyPromise();
        }

        $scope.status.inProgress = true;
        return downloadAllData()
            .then(drawChartFromScratch)
            .catch(function(error){
                $scope.chartSeries = {
                    from: $scope.filters.chart.timePeriod.value,
                    to: $scope.filters.chart.to,
                    timeUnit: $scope.filters.chart.timePeriod.unit,
                    series: []
                };
                $scope.status.errorLoadingDataReason = error.message;
                $scope.status.errorLoadingData = true;
            })
            .finally(function() {
                $scope.status.inProgress = false;
            });
    }

    function drawChartFromScratch(data){
        data.timeUnit = $scope.filters.chart.timePeriod.unit;
        $scope.chartSeries = data;

        $scope.$watch("chartData", function(){
            $scope.tableChartData.reload();
        }, true);

        calculateChartHeight();

        $scope.isChartRendered = true;
    }

    $scope.renderChart = refreshChart;

    function downloadData(filters) {
        if(dataCanceler) {
            dataCanceler.resolve();
        }
        dataCanceler = $q.defer();

        return dataService.search(filters, dataCanceler).then(function(data) {
            if(data.to) {
                $scope.lastQueryTimeStamp = data.to;
            }
            data.minMaxLinesAccepted = $scope.filters.chart.minMaxLinesAccepted;
            return data;
        });
    }

    function downloadAllData() {
        return downloadData(getFilters());
    }

    function downloadNewData() {
        var filters = getFilters();
        var sign = 1;
        if(Math.abs(filters.from) > $scope.lastQueryTimeStamp) {
            sign = Math.abs(filters.from) / filters.from;
        }
        filters.from = Math.max(Math.abs(filters.from), $scope.lastQueryTimeStamp) * sign;
        return downloadData(filters);
    }

    function isEmpty(obj) {

        if (obj === null) {
            return true;
        }

        if (obj.length > 0)    {
            return false;
        }
        if (obj.length === 0)  {
            return true;
        }

        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                return false;
            }
        }

        return true;
    }

    $scope.stopAutoRefresh = function() {
        if (angular.isDefined(chartRefreshCancellationToken)) {
            $timeout.cancel(chartRefreshCancellationToken);
            chartRefreshCancellationToken = undefined;
        }
    };

    $scope.$on('$destroy', function() {
        // Make sure that the interval is destroyed too
        $scope.stopAutoRefresh();
    });

    $scope.restartRefresh = function(){
        $scope.stopAutoRefresh();
        scheduleRefresh();
    };

    $scope.downloadCsv = function() {
        if($scope.noMetrics()) {
            return;
        }

        $scope.error = null;
        var searchFilters = getFilters();

        dataService.downloadCsv(searchFilters, function(data){
            var blob = new Blob([data], { type: 'text/csv', charset: 'utf-8' });
            var url  = window.URL || window.webkitURL;
            var link = document.createElement("a");
            link.href = url.createObjectURL(blob);
            link.download = (new Date().getTime() - searchFilters.from) + '-' + new Date().getTime() + '.csv';

            var event = document.createEvent("MouseEvents");
            event.initEvent("click", true, false);
            link.dispatchEvent(event);

        }, function(data){
            $scope.error = data;
        });
    };

    $scope.selectRecipients = function() {
        if($scope.noMetrics()) {
            return;
        }

        var sendMeasurementsByEmailModalInstance = $modal.open({
            templateUrl: 'public/partials/charts/mailList.html',
            controller: 'SendMeasurementsByEmailModalCtrl',
            resolve: {
                users: function() {
                    return usersService.data.userList;
                },
                searchFilters: function() {
                    return getFilters();
                }
            }
        });
        return sendMeasurementsByEmailModalInstance;
    };

    var ComponentDetailsModalInstanceCtrl = function ($scope, $modalInstance, componentId, componentsService) {
        $scope.addEditMode = "view";
        $scope.updateable = false;


        $scope.close = function () {
            $modalInstance.close();
        };

        componentsService.getComponentDefinition(componentId, function (data) {
            $scope.component = data;
        }, function () {

        });
    };

    $scope.showComponentDetails = function(componentId){
        return $modal.open({
            templateUrl: 'public/partials/devices/componentDefinition.html',
            controller: ComponentDetailsModalInstanceCtrl,
            resolve: {
                componentId: function () {
                    return componentId;
                }
            }
        });
    };

    $scope.clear = function(){
        $scope.filters.chart.devices = {};
        $scope.filters.chart.metrics = {};
        $scope.chartData = [];
    };

    /* TOUR SETTING */
    if($scope.i18n.charts.tour) {
        var steps = [];
        Object.keys($scope.i18n.charts.tour).forEach(function (step) {
            steps.push({element: "#" + step, intro: $scope.i18n.charts.tour[step]});
        });
        $scope.intro_options.introId = "charts";
        $scope.intro_options.steps = steps;
        $scope.intro_options.recordStep = true;

        $window.setTimeout(function () {
            $scope.startTour(true);
        }, 500);
    }
    /* DONE TOUR SETTING */

    $scope.customTimePeriod = function() {
        var modalInstance3 = $modal.open({
            templateUrl: 'public/partials/charts/customTimePeriod.html',
            controller: 'CustomTimeModalCtrl',
            resolve: {
                currentFilter: getFilters
            }
        });
        modalInstance3.result.then(function (period) {
            $scope.filters.chart.timePeriod.value = period.from.getTime();
            $scope.filters.chart.timePeriod.to = period.to.getTime();
            $scope.chosenTimePeriod = period;

        }, function () {
        });
        return modalInstance3;
    };
    $scope.show = {
        searchDevice : true,
        selectDevice : true
    };
});
