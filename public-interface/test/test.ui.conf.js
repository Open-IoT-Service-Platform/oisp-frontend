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

 const puppeteer = require('puppeteer');
 process.env.CHROME_BIN = puppeteer.executablePath();

// Karma configuration
module.exports = function(config) {
    config.set({
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'sinon' ],

        // list of files / patterns to load in the browser
        files: [
            'dashboard/public/lib/moment/moment.min.js',
            'dashboard/public/lib/jquery/jquery-1.11.0.min.js',
            'dashboard/public/lib/jquery/jquery-ui.min.js',
            'dashboard/public/lib/rickshaw/rickshaw.js',
            'dashboard/public/lib/rickshaw/extensions.js',
            'dashboard/public/lib/angular/angular.min.js',
            'dashboard/public/lib/angular/angular-route.min.js',
            'dashboard/public/lib/angular/angular-mocks.js',
            'dashboard/public/js/iotController.js',
            'dashboard/public/js/iotServices.js',
            'dashboard/public/js/controllers/**/*.js',
            'dashboard/public/js/services/*.js',
            'dashboard/public/lib/ng-table/ng-table.src.js',
            'dashboard/public/lib/ngProgress/ngProgress.min.js',
            'dashboard/public/lib/angular-flash/angular-flash.js',
            'dashboard/public/lib/entropizer/entropizer.min.js',
            'test/ui/controllers/**/*.js',
            'test/ui/services/*.js',
            'dashboard/public/partials/directives/*.html'
        ],

        // list of files to exclude
        exclude: [],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'dashboard/public/js/**/*.js': ['coverage']
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],

        coverageReporter: [
            {
                type : 'html',
                dir : 'dist/coverage/'
            },
            {
                type : 'teamcity'
            }
        ],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['ChromeHeadlessNoSandbox'],

        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        },

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true
    });
};
