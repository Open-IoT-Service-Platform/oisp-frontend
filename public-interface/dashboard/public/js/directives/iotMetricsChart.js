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

/*global angular,Rickshaw,d3*/

'use strict';
iotApp.directive('iotMetricsChart', function(componentsService){

    function link(scope, element, attributes){
        if(!attributes.rawData){
            attributes.rawData = "rawData";
        }
        if(!scope[attributes.rawData]){
            scope[attributes.rawData] = [];
        }

        var componentDefinitions;
        var legend = angular.element(attributes.legendSelector)[0];

        var chartSeries = [];
        var chartHeight;
        var renderType;
        var minMaxDisabledForRenderTypes = [ "unstackedarea" ];

        var time = new Rickshaw.Fixtures.Time();
        var timeUnit = time.unit("day");

        scope.scales = [];

        var initialSeries = {
            data: [{"x":0, "y":0}],
            name: "no data selected"
        };

        function getColorPalette(palette){
            var order = -1;

            function addColorIntensity(color, intensity){
                var colorObject = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                var r = parseInt(colorObject[1], 16) + (20 * intensity);
                var g = parseInt(colorObject[2], 16) + (20 * intensity);
                var b = parseInt(colorObject[3], 16) + (20 * intensity);

                return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }

            function extractNewColor(color){
                var colorObject = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                var r = parseInt(colorObject[1], 16);
                var g = parseInt(colorObject[2], 16);
                var b = parseInt(colorObject[3], 16);

                return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }

            return {
                yAxis: palette.color(),
                nextIntensity: function (){
                    order += 10;
                    return addColorIntensity(this.yAxis, order);
                },
                chooseNextColor: function (){
                    this.yAxis = palette.color();
                    return extractNewColor(this.yAxis);
                }
            };
        }

        scope.getLocalTimeFromUTC = function(milis) {
            return milis;
        };

        function generateScales(series, callback){
            var palette = new Rickshaw.Color.Palette( { scheme: 'munin' } );
            var err = [];

            if(!series || series.length <= 0){
                callback(err);
            }

            var completed = function(){
                //Generate scales
                scope.scales = [];

                series.forEach(function(deviceComponentPair){
                    deviceComponentPair.points.forEach(function(point){
                        var value = parseFloat(point.value);

                        var definition = componentDefinitions.filter(function(item){
                            return item.id === deviceComponentPair.componentType;
                        })[0];

                        var existentScale = scope.scales.filter(function(item){
                            return definition.measureunit === item.unit;
                        })[0];

                        var scaledValue = Math.ceil(value);
                        if(existentScale){
                            existentScale.min = existentScale.min < value ? existentScale.min : scaledValue - 1;
                            existentScale.max = existentScale.max > value ? existentScale.max : scaledValue;

                            if(existentScale.types.indexOf(deviceComponentPair.componentType) === -1){
                                existentScale.types.push(deviceComponentPair.componentType);
                            }

                        }else{
                            scope.scales.push({
                                unit: definition.measureunit,
                                min: scaledValue - 1,
                                max: scaledValue,
                                types: [deviceComponentPair.componentType],
                                color: getColorPalette(palette)
                            });
                        }
                    });
                });

                for(var item in scope.scales){
                    var scale = scope.scales[item];

                    if (scale.max - scale.min < 1){
                        scale.min = scale.min - 1;
                    }

                    scale.scale = d3.scale.linear().domain([scale.min, scale.max]);
                }
                callback(err);
            };

            //Get Components Definition
            componentDefinitions = [];
            var completedItems = 0;
            series.forEach(function(deviceComponentPair){
                var definitionByType = componentDefinitions.filter(function(item){
                    return item.id === deviceComponentPair.componentType;
                });

                if(definitionByType.length === 0){
                    componentsService.getComponentDefinition(deviceComponentPair.componentType, function(data){
                        componentDefinitions.push(data);

                        completedItems ++;
                        if(completedItems === series.length ){
                            completed();
                        }
                    }, function(data, status){
                        err.push('error getting component definition ' + data + ' ' + status);

                        completedItems ++;
                        if(completedItems === series.length) {
                            completed();
                        }
                    });
                }else{
                    completedItems ++;
                    if(completedItems === series.length) {
                        completed();
                    }
                }
            });
        }

        var intFormatter = function(n) {
            return n.toFixed(0);
        };

        var floatFormatter = function(n) {
            return n.toFixed(2);
        };

        function computeRawDataForSeries(series){
            if(series == null) return;

            scope[attributes.rawData].length = 0;

            series.forEach(function(deviceComponentPair){
                deviceComponentPair.points.forEach(function(value){
                    var data = {
                        deviceId: deviceComponentPair.deviceId,
                        deviceName: deviceComponentPair.deviceName,
                        metricId: deviceComponentPair.componentType,
                        componentName: deviceComponentPair.componentName,
                        componentId: deviceComponentPair.componentId,
                        timestamp: scope.getLocalTimeFromUTC(parseInt(value.ts)),
                        value: isNaN(value.value)? value.value: parseFloat(value.value)
                    };

                    scope[attributes.rawData].push(data);
                });
            })
        }

        function renderChart(data){
            var series = [];
            chartSeries = [initialSeries];

            scope[attributes.rawData].length = 0;

            if(!data){
                return;
            }

            if(data.timeUnit){
                timeUnit = time.unit(data.timeUnit);
            }

            generateScales(data.series, function(err){
                if(err.length > 0){
                    return;
                }
                //generate chart data

                computeRawDataForSeries(data.series)

                var dataFrom = parseInt(data.from);
                var dataTo = parseInt(data.to);
                data.series.forEach(function(deviceComponentPair){
                    var seriesName = deviceComponentPair.componentName + " (" + deviceComponentPair.componentId + ", " +
                        deviceComponentPair.componentType + ")" + " - " + deviceComponentPair.deviceName + " (" +
                        deviceComponentPair.deviceId + ")";
                    var seriesData = [];
                    var formatter;
                    componentDefinitions.forEach(function(definition){
                        if(deviceComponentPair.componentType === definition.id) {
                            deviceComponentPair.format = definition.format;
                        }
                    });

                    var minSerie = [], maxSerie = [];

                    if(deviceComponentPair.points.length > 0) {
                        var minValue = +parseFloat(deviceComponentPair.points[0].value).toFixed(2), maxValue = +parseFloat(deviceComponentPair.points[0].value).toFixed(2);
                        for(var i = 0; i < deviceComponentPair.points.length; i++) {
                            if (+parseFloat(deviceComponentPair.points[i].value/1).toFixed(2) > maxValue) {
                                maxValue = +parseFloat(parseFloat(deviceComponentPair.points[i].value).toFixed(2));
                            }
                            if (+parseFloat(deviceComponentPair.points[i].value/1).toFixed(2) < minValue) {
                                minValue = +parseFloat(parseFloat(deviceComponentPair.points[i].value).toFixed(2));
                            }
                        }
                        if(data.minMaxLinesAccepted && deviceComponentPair.points.length > 1) {
                            minSerie.push({
                                "x": parseInt(dataFrom) / 1000,
                                "y": minValue
                            });
                            minSerie.push({
                                "x": parseInt(dataTo) / 1000,
                                "y": minValue
                            });
                            maxSerie.push({
                                "x": parseInt(dataFrom) / 1000,
                                "y": maxValue
                            });
                            maxSerie.push({
                                "x": parseInt(dataTo) / 1000,
                                "y": maxValue
                            });
                        }
                    }

                    if(deviceComponentPair.points.length === 0) {
                        seriesData.push({
                            "x": parseInt((new Date()).getTime()/1000),
                            "y": parseFloat(0)
                        });
                    }

                    if (deviceComponentPair.format === 'integer') {
                        formatter = intFormatter;
                    } else {
                        formatter = floatFormatter;
                    }
                    deviceComponentPair.points.forEach(function(value){
                        if(!isNaN(value.value)){
                            seriesData.push({
                                "x": scope.getLocalTimeFromUTC(parseInt(value.ts))/1000,
                                "y": parseFloat(value.value)
                            });
                        }
                    });

                    var seriesScale = scope["scales"].filter(function(item){
                        return item.types.indexOf(deviceComponentPair.componentType) > -1;
                    })[0];

                    if (seriesData.length > 0 && seriesScale) {
                        series.push({
                            color: seriesScale.color.chooseNextColor(),
                            data: seriesData,
                            name: seriesName,
                            scale: seriesScale.scale,
                            yFormatter: formatter
                        });
                        if(minSerie.length > 0 && maxSerie.length > 0){
                            series.push({
                                color: seriesScale.color.nextIntensity(),
                                data: minSerie,
                                scale: seriesScale.scale,
                                name: 'min value of ' + seriesName,
                                disabled: minMaxDisabledForRenderTypes.indexOf(renderType) !== -1
                            });
                            series.push({
                                color: seriesScale.color.nextIntensity(),
                                data: maxSerie,
                                scale: seriesScale.scale,
                                name: 'max value of ' + seriesName,
                                disabled: minMaxDisabledForRenderTypes.indexOf(renderType) !== -1
                            });
                        }
                    }
                });

                if (series.length > 0){
                    var fakeSeries = {
                        hidden: true,
                        data: [],
                        color: "#FAFAFA"
                    };

                    var minFrom = parseInt(data.from);
                    var maxTo = parseInt(data.to);
                    if(data.series[0].points.length > 0) {
                        minFrom = scope.getLocalTimeFromUTC(parseInt(data.series[0].points[0].ts));
                        maxTo = scope.getLocalTimeFromUTC(parseInt(data.series[0].points[data.series[0].points.length - 1].ts));
                    }

                    for(var j = 1; j < data.series.length; j++) {
                        if(data.series[j].points.length > 0) {
                            if(scope.getLocalTimeFromUTC(data.series[j].points[0].ts) < minFrom){
                                minFrom = scope.getLocalTimeFromUTC(parseInt(data.series[j].points[0].ts));
                            }
                            if(data.series[j].points[data.series[j].points.length - 1].ts > maxTo){
                                maxTo = scope.getLocalTimeFromUTC(parseInt(data.series[j].points[data.series[j].points.length - 1].ts));
                            }
                        }
                    }

                    if(minFrom !== 0){
                        fakeSeries.data.push({
                            "x": minFrom / 1000,
                            "y": 0
                        });


                        var milliseconds = time.unit(data.timeUnit).seconds * 1000;
                        for(var i = minFrom; i <= maxTo; i = i + (milliseconds / 10)){
                            fakeSeries.data.push({
                                "x": i / 1000,
                                "y": 0
                            });
                        }
                    }

                    fakeSeries.data.push({
                        "x": maxTo / 1000,
                        "y": 0
                    });

                    /* Disabling the fake series being pushed to series.
                       This fixes the bug of real time graph.
                       Keep the code until the use of fakeSeries is discovered. 
                     */
                    // series.push(fakeSeries);
                    chartSeries = series;
                }

                rickshawChart();
            });
        }

        var mGraph = {
            preview:  {},
            hoverDetail: {},
            legend: {},
            order: {},
            highlighter:{},
            xAxis:{},
            yAxis:{}

        };

        function rickshawChart (){
            $("#chartElement").empty();
            $("#preview").empty();
            $(".y_axis").empty();
            $(attributes.legendSelector).empty();

            if(!chartSeries ||
                chartSeries.length <= 0 ||
                !chartHeight ||
                !renderType){
                return;
            }

            Rickshaw.namespace('Rickshaw.Graph.Renderer.UnstackedArea');
            Rickshaw.Graph.Renderer.UnstackedArea = Rickshaw.Class.create(Rickshaw.Graph.Renderer.Area, {
                name: 'unstackedarea',
                defaults: function($super) {
                    return Rickshaw.extend($super(), {
                        unstack: true,
                        fill: false,
                        stroke: false
                    });
                }
            } );

            var axisWidth = scope["scales"].length * 55;
            var chartWidth = angular.element(".chart-display").parent().width() - axisWidth - 50;

            angular.element(".chart-y-axis").css("width", axisWidth);
            angular.element(".chart-display").css("width", chartWidth);

            mGraph.main = new Rickshaw.Graph( {
                element: angular.element("#chartElement")[0],
                height: 500, //chartHeight ,
                renderer: renderType,
                interpolation: 'linear',
                series: chartSeries,
                min: 'auto'
            } );

            if(attributes.showPreview){
                mGraph.preview = new Rickshaw.Graph.RangeSlider.Preview( {
                    graph: mGraph.main,
                    element: angular.element("#preview")[0],
                    renderer: renderType,
                    height: 50
                });
            }

            var defaultFormatter = function(n) {
                return n;
            };
            
            mGraph.hoverDetail = new Rickshaw.Graph.HoverDetail( {
                graph:  mGraph.main,
                hideXLegend: true,
                formatter: function(series, x, y) {
                    var rawDateStr = new Date(x *1000).toString();
                    var date = rawDateStr.replace("GMT","");
                    var timezoneStrPos = date.indexOf("(");
                    date = '<span class="date">' + date.slice(0, timezoneStrPos-1) +'</span>';

                    var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + '"></span>';

                    var formatter = series.yFormatter || defaultFormatter;
                    return swatch + "value: " + formatter(y) + '<br>' + date;
                }
            });

            mGraph.legend = new Rickshaw.Graph.Legend( {
                graph: mGraph.main,
                element: legend

            } );

            mGraph.shelving = new Rickshaw.Graph.Behavior.Series.Toggle( {
                graph:  mGraph.main,
                legend:  mGraph.legend
            } );

            mGraph.order = new Rickshaw.Graph.Behavior.Series.Order( {
                graph: mGraph.main,
                legend: mGraph.legend
            } );

            mGraph.highlighter = new Rickshaw.Graph.Behavior.Series.Highlight( {
                graph: mGraph.main,
                legend: mGraph.legend
            } );

            mGraph.xAxis = new Rickshaw.Graph.Axis.Time( {
                graph: mGraph.main,
                timeFixture: new Rickshaw.Fixtures.Time()
            } );

            mGraph.xAxis.render();


            setTimeout(function () {
                if(scope["scales"] && angular.isArray(scope["scales"])){
                    var grid = true;
                    scope["scales"].forEach(function(scale){
                        mGraph.yAxis = new Rickshaw.Graph.Axis.Y.Scaled( {
                            element: angular.element('[id="' + scale.unit + '"]')[0],
                            orientation: 'left',
                            graph: mGraph.main,
                            scale : scale.scale,
                            axisText: scale.unit,
                            axisColor: scale.color.yAxis,
                            ticks: 10,
                            tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
                            grid: grid
                        });

                        mGraph.yAxis.render();
                        grid=false;
                    });
                    var order = 0;
                    scope["scales"].forEach(function(scale){
                        angular.element('[id="' + scale.unit + '"]')[0].style.right = ((order * 55)) + 'px';
                        order ++;
                    });
                }

            }, 200);

            mGraph.main.configure({renderer: renderType});
            mGraph.main.render();
        }

        scope.refreshChart = function(){
            setTimeout(function(){
                rickshawChart();
            }, 10);
        };



        scope.$watch(attributes.data, function(value) {
            renderChart(value);
        });

        scope.$watch(attributes.renderType, function(value) {
            renderType = value;
            rickshawChart();
        });

        scope.$watch(attributes.series, function(value){
            computeRawDataForSeries(value)
            if(mGraph.main){
                value.forEach(function(newSerie) {
                    if(newSerie.points.length === 0) {
                        return;
                    } else {
                        var seriesName = newSerie.componentName + " (" + newSerie.componentId + ", " + newSerie.componentType + ") - " + newSerie.deviceName + " (" + newSerie.deviceId + ")";
                        var graphSerie = chartSeries.filter(function(serie) {
                            return (seriesName === serie.name);
                        });
                        var minGraphSerie = chartSeries.filter(function(serie) {
                            return ('min value of ' + seriesName) === serie.name;
                        });
                        var maxGraphSerie = chartSeries.filter(function(serie) {
                            return ('max value of ' + seriesName) === serie.name;
                        });
                        if(graphSerie && graphSerie[0]) {
                            graphSerie[0].data = [];
                            newSerie.points.forEach(function (point) {
                                if (!isNaN(point.value)) {
                                    graphSerie[0].data.push({
                                        "x": scope.getLocalTimeFromUTC(parseInt(point.ts)) / 1000,
                                        "y": parseFloat(point.value)
                                    });
                                    if(minGraphSerie.length > 0) {
                                        if(minGraphSerie && (minGraphSerie[0].data[0].y > parseFloat(point.value))) {
                                            minGraphSerie[0].data[0].y = parseFloat(point.value);
                                            minGraphSerie[0].data[1].x = scope.getLocalTimeFromUTC(parseInt(point.ts)) / 1000;
                                            minGraphSerie[0].data[1].y = parseFloat(point.value);
                                        } else {
                                            minGraphSerie[0].data[1].x = scope.getLocalTimeFromUTC(parseInt(point.ts)) / 1000;
                                        }
                                    }
                                    if(maxGraphSerie.length > 0) {
                                        if(maxGraphSerie && (maxGraphSerie[0].data[0].y < parseFloat(point.value))) {
                                            maxGraphSerie[0].data[0].y = parseFloat(point.value);
                                            maxGraphSerie[0].data[1].x = scope.getLocalTimeFromUTC(parseInt(point.ts)) / 1000;
                                            maxGraphSerie[0].data[1].y = parseFloat(point.value);
                                        } else {
                                            maxGraphSerie[0].data[1].x = scope.getLocalTimeFromUTC(parseInt(point.ts)) / 1000;
                                        }
                                    }
                                }
                            });
                        }
                    }
                });
                mGraph.main.update();
            }
        },true);

        scope.$watch(attributes.height, function(value) {
            chartHeight = value;
            rickshawChart();
        }, true);
    }

    return {
        restrict: 'E',
        link: link,
        templateUrl: 'public/partials/directives/iotMetricsChart.html'
    };
});
