module.exports = function (grunt) {
    require('time-grunt')(grunt);

    grunt.initConfig({
        clean: {
            build: ['build/temp'],
            dist: ['dist/*']
        },
        jshint: {
            src: {
                src: ['src/**/*.js', 'Gruntfile.js'],
                options: {
                    jshintrc: '.jshintrc'
                }
            }
        },
        concat: {
            all: {
                src: ['./build/temp/MediaPlayer.js', './build/temp/Protection.js', './externals/*.js'],
                dest: 'build/temp/Dash.all.js',
            },
        },
        uglify: {
            options: {
                sourceMap: true,
                sourceMapIn: 'build/temp/Dash.all.js.map',
                sourceMapRoot: './src/',
                preserveComments: 'some',
                mangle: true,
                compress: {
                    sequences: true,
                    dead_code: true,
                    conditionals: true,
                    booleans: true,
                    unused: true,
                    if_return: true,
                    join_vars: true,
                    drop_console: true
                }
            },
            build: {
                files: {
                    'build/temp/dash.min.js': 'build/temp/MediaPlayer.js',
                    'build/temp/dash.protection.min.js': 'build/temp/Protection.js',
                    'build/temp/dash.all.min.js': 'build/temp/Dash.all.js'
                }
            },

            core_debug: {
                options: {
                    beautify: true,
                    compress: false,
                    mangle: false,
                    sourceMap: true,
                    sourceMapIn: 'build/temp/Dash.all.js.map',
                    sourceMapRoot: './src/',
                },
                files: {
                    'build/temp/dash.debug.js': 'build/temp/Dash.all.js'
                }
            },

            protection_debug: {
                options: {
                    sourceMap: true,
                    sourceMapIn: 'build/temp/Protection.js.map',
                    sourceMapRoot: './src/streaming/',
                    beautify: true,
                    compress: false,
                    mangle: false
                },
                files: {
                    'build/temp/dash.protection.debug.js': 'build/temp/Protection.js',
                }
            }
        },

        //watch: {
        //    default: {
        //        files: ['src/**/*', 'Gruntfile.js'],
        //        tasks: 'dev'
        //    }
        //},


        copy: {
            dist: {
                expand: true,
                cwd: 'build/temp/',
                src: [
                    'dash.all.min.js', 'dash.all.min.js.map',
                    'dash.min.js', 'dash.min.js.map',
                    'dash.protection.min.js', 'dash.protection.min.js.map',
                    'dash.protection.debug.js', 'dash.protection..debug.js.map',
                    'dash.debug.js', 'dash.debug.js.map'
                ],
                dest: 'dist/',
                filter: 'isFile'
            }
        },
        exorcise: {
            build: {
                options: {},
                files: {
                    'build/temp/Dash.all.js.map': ['build/temp/Dash.all.js']
                }
            },

            debug: {
                options: {},
                files: {
                    'build/temp/MediaPlayer.js.map': ['build/temp/MediaPlayer.js'],
                    'build/temp/Protection.js.map': ['build/temp/Protection.js'],
                }
            }
        },
        browserify: {
            build_core: {
                files: {
                    'build/temp/MediaPlayer.js': ['src/streaming/MediaPlayer.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'MediaPlayer'
                    },
                    plugin: [
                      ['browserify-derequire']
                    ],
                    transform: ['babelify']
                }
            },
            build_protection: {
                files: {
                    'build/temp/Protection.js': ['src/streaming/protection/Protection.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'Protection'
                    },
                    plugin: [
                        ['browserify-derequire']
                    ],
                    transform: ['babelify']
                }
            },
            watch: {
                files: {
                    'build/temp/MediaPlayer.js': ['src/js/MediaPlayer.js']
                },
                options: {
                    watch: true,
                    keepAlive: true,
                    browserifyOptions: {
                        standalone: 'MediaPlayer'
                    },
                    transform: ['babelify'],
                    plugin: [
                      ['browserify-derequire']
                    ]
                }
            }
        },
        jsdoc: {
            dist: {
                options: {
                    destination: 'docs/jsdocs',
                    configure: 'build/jsdoc/jsdoc_conf.json'
                }
            }
        },
        mocha_istanbul: {
            test: {
                src: './test',
                options: {
                    mask: '*.js',
                    coverageFolder: './reports',
                    mochaOptions: ['--compilers', 'js:babel/register'],
                    print: 'summary',
                    root: './src'
                }
            }
        },
        jscs: {
            src: './src/**/*.js',
            options: {
                config: '.jscsrc'
            }
        }
    });

    require('load-grunt-tasks')(grunt);
    grunt.registerTask('default',  ['dist', 'test']);
    grunt.registerTask('release',  ['dist', 'test', 'jsdoc']);
    grunt.registerTask('dist',     ['build', 'minimize', 'copy:dist']);
    grunt.registerTask('build',    ['clean', 'jshint', 'browserify:build_core', 'browserify:build_protection', 'concat']);
    grunt.registerTask('minimize', ['exorcise', 'uglify']);
    grunt.registerTask('test',     ['mocha_istanbul:test']);
    grunt.registerTask('watch',    ['browserify:watch']);

    //grunt.registerTask('debug', [
    //    'clean',
    //    'browserify',
    //    "concat",
    //    'exorcise:debug',
    //    'uglify:core_debug',
    //    'uglify:protection_debug'
    //]);

};