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
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            jshint: 'buildscripts/jshint',
            eslint: 'buildscripts/eslint',
            jsfiles: ['Gruntfile.js',
                'app.js',
                'config.js',
                'lib/**/*.js',
                'grafana/*.js'],
            codeCoverageExclude: []
        },
        jshint: {
            options: {
                jshintrc: '<%= dirs.jshint %>/config.json',
                ignores: []
            },
            local: {
                src: ['<%= dirs.jsfiles %>'],
                options: {
                    force: false
                }
            },
            teamcity: {
                src: ['<%= dirs.jsfiles %>'],
                options: {
                    force: true,
                    reporter: require('jshint-teamcity')
                }
            }
        },
        eslint: {
            local: {
                options: {
                    configFile: '<%= dirs.eslint %>/config.json',
                    ignorePattern: [],
                    quiet: true
                },
                src: ['<%= dirs.jsfiles %>'],
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-eslint');

    // Default task(s).
    grunt.registerTask('default', [
        'eslint:local',
        'jshint:local',
    ]);

    grunt.registerTask('validate', [
        'eslint:local',
        'jshint:local'
    ]);
};
