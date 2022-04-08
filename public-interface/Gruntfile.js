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
    // Project configuration.
    var buildID = grunt.option('buildID') || 'local';
    var testToRun = grunt.option('name') || '';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            jshint: 'buildscripts/jshint',
            eslint: 'buildscripts/eslint',
            jsfiles: ['Gruntfile.js',
                'app.js',
                'config.js',
                'admin/*.js',
                'dashboard/routes/*.js',
                'dashboard/public/js/**/*.js',
                'iot-entities/**/*.js',
                'engine/**/*.js',
                'lib/**/*.js',
                'doc/api/*.js',
                'grafana/*.js'],
            codeCoverageExclude: [
                "**/iot-entities/*","**/iot-entities/postgresql/*",
                "**/iot-entities/redis/*",
                "**/iot-entities/postgresql/models/*",
                "**/lib/entropizer/**",
                "**/lib/json-gate/**"]
        },
        jshint: {
            options: {
                jshintrc: '<%= dirs.jshint %>/config.json',
                ignores: ['lib/entropizer/*.js' ]
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
                    ignorePattern: [ 'lib/entropizer/*.js' ],
                    quiet: true
                },
                src: ['<%= dirs.jsfiles %>'],
            }
        },
        nyc: {
            cover: {
                options: {
                    include: ['config.js', 'engine/**', 'lib/**'],
                    exclude: '<%= dirs.codeCoverageExclude %>',
                    reporter: ['lcov', 'text-summary'],
                    all: true
                },
                cmd: false,
                debug: false,
                args: ['grunt', 'simplemocha:unit']
            }
        },
        simplemocha: {
            unit: {
                ui: 'bdd',
                src: ['./test/unit/**/*.js'],
                bail: true,
                fullTrace: true,
                grep: testToRun
            }
        },
        compress: {
            teamcity: {
                options: {
                    archive: '../coverage/' + 'iotkit-dashboard-' + buildID + ".tar.gz",
                    mode: 'tgz'
                },
                files: [
                    {
                        cwd: '../build',
                        expand: true,
                        src: ['**'],
                        /* this is the root folder of untar file */
                        /* dest: '<%= pkg.name %>/' */
                        dest: 'iotkit-dashboard/'
                    }
                ]
            }
        },
        copy: {
            /* dashboard/public/js is copied by uglify */
            /* dashboard/public/css/ is copied by cssmin */
            build: {
                cwd: '.',
                expand: true,
                src: [
                    '**/*.pem',
                    '**/*.js',
                    '**/*.*',
                    'Procfile',
                    '!log.txt',
                    '!nginx/**',
                    '!npm-debug.log',
                    '!README.md',
                    '!buildscripts/**',
                    '!node_modules/**',
                    '!test/**',
                    '!Gruntfile.js',
                    '!dashboard/public/**/*.map',
                    '!dashboard/public/lib/**',
                    '!dashboard/public/css/**/*.css',
                    '!dashboard/public/js/**/*.js',
                    'dashboard/public/css/font-awesome.min.css'
                ],
                dest: '../build'
            },
            deploy: {
                cwd: '..',
                expand: true,
                src: [
                    'deploy/**/*.js',
                    'deploy/**/*.sql*'
                ],
                dest: '../build'
            }
        },
        clean: {
            options:{force:true},
            build: {
                src: ['../build/**', '../coverage/**']
            },
            tmp:{
                src:['.tmp']
            }
        },
        bumpup: {
            setters: {
                version: function (old) {
                    var ret = old;
                    if (buildID !== 'local') {
                        var ver = old.split(".");
                        var build = buildID.split('.');
                        for(var i = 0; i < build.length; i++) {
                            ver[2 + i] = build[i];
                        }
                        ret = ver.join('.');
                    }
                    return ret;
                },
                date: function () {
                    return new Date().toISOString();
                }
            },
            file: '../build/package.json'
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> ' + buildID + ' */\n',
                mangle: false
            }
        },
        cssmin: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> ' + buildID + ' */',
                mangle: false
            }
        },
        filerev: {
            default: {
                src: [
                    '../build/dashboard/public/css/generated/external-bootstrap.css',
                    '../build/dashboard/public/css/generated/iotkit-index.css',
                    '../build/dashboard/public/js/iotkit-index.js',
                    '../build/dashboard/public/js/external-index.js',
                    '../build/dashboard/public/css/generated/iotkit-dashboard.css',
                    '../build/dashboard/public/css/generated/external-dashboard.css',
                    '../build/dashboard/public/js/iotkit-dashboard.js',
                    '../build/dashboard/public/js/external-dashboard.js',
                    '../build/dashboard/public/css/font-awesome.min.css'
                ]
            }
        },
        shell: {
            build: {
                command: "make -C doc/api install"
            },
            clean: {
                command: 'make -C doc/api clean'
            },
            test: {
                command: 'make -C doc/api test'
            }
        },

        karma: {
            unit: {
                configFile: 'test/test.ui.conf.js'
            }
        }
    });
    grunt.event.on('coverage', function (lcovFileContents, done) {
        // Check below
        done();
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-simple-nyc');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-karma');

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-bumpup');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', [
        'eslint:local',
        'jshint:local',
        'nyc:cover',
        'karma:unit',
        'shell:build'
    ]);

    grunt.registerTask('validate', [
        'eslint:local',
        'jshint:local'
    ]);

    grunt.registerTask('run_test', [
        'simplemocha:unit',
        'karma:unit',
	    'shell:test'
    ]);

    grunt.registerTask('packaging', [
        'bumpup',
        'build',
        'compress:teamcity'
    ]);

    grunt.registerTask('debugPackaging', [
        'bumpup',
        'clean:build',
        'copy:build',
        'copy:deploy',
        'compress:teamcity',
        'clean:tmp'
    ]);

    grunt.registerTask('build', 'Creates build dir with distributable and uglified code', [
        'eslint:local',
        'jshint:local',
        'clean:build',
        'shell:build',
        'copy',
        'bumpup',
        'awesome',
        'clean:tmp']
    );

    grunt.registerTask('awesome', [
        'concat',
        'cssmin',
        'uglify',
        'filerev',
    ]);

    grunt.registerTask('clean-api', ['shell:clean']);

    grunt.registerTask('build-api', [
        'shell:build'
    ]);
};
