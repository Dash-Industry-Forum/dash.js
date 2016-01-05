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
        uglify: {
            options: {
                sourceMap: true,
                sourceMapIncludeSources: true,
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

            build_all: {
                options: {
                    sourceMapIn: 'build/temp/All.js.map'
                },
                files: {
                    'build/temp/dash.all.min.js': ['build/temp/All.js', 'externals/*.js']
                }
            },
            build_core: {
                options: {
                    sourceMapIn: 'build/temp/MediaPlayer.js.map'
                },
                files: {
                    'build/temp/dash.mediaplayer.min.js': 'build/temp/MediaPlayer.js'
                }
            },
            build_external: {
                files: {
                    'build/temp/dash.externals.min.js': 'externals/*.js',
                }
            },
            build_protection: {
                options: {
                    sourceMapIn: 'build/temp/Protection.js.map'
                },
                files: {
                    'build/temp/dash.protection.min.js': 'build/temp/Protection.js'
                }
            },

            /**
             * BEWARE: It looks like when the beautify option is included the source maps that are
             * generated don't work properly. The result is all of the source files loaded, but setting
             * breakpoints in one file results in breakpoints being set in random other files.
             * As a result sourcemaps have been disabled for beautified builds.
             */
            debug_all: {
                options: {
                    sourceMap: false,
                    beautify: true,
                    compress: false,
                    mangle: false,
                    sourceMapIn: 'build/temp/All.js.map',
                    sourceMapRoot: './src/',
                },
                files: {
                    'build/temp/dash.all.debug.js': ['build/temp/All.js', 'externals/*.js']
                }
            },
            debug_core: {
                options: {
                    sourceMap: false,
                    beautify: true,
                    compress: false,
                    mangle: false,
                    sourceMapIn: 'build/temp/MediaPlayer.js.map',
                    sourceMapRoot: './src/',
                },
                files: {
                    'build/temp/dash.mediaplayer.debug.js': 'build/temp/MediaPlayer.js'
                }
            },
            debug_external: {
                options: {
                    sourceMap: false,
                    sourceMapRoot: './externals',
                    beautify: true,
                    compress: false,
                    mangle: false
                },
                files: {
                    'build/temp/dash.externals.debug.js': 'externals/*.js'
                }
            },
            debug_protection: {
                options: {
                    sourceMap: false,
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
                    'dash.externals.min.js', 'dash.externals.min.js.map',
                    'dash.mediaplayer.min.js', 'dash.mediaplayer.min.js.map',
                    'dash.protection.min.js', 'dash.protection.min.js.map',
                    'dash.all.debug.js', 'dash.all.debug.js.map',
                    'dash.externals.debug.js', 'dash.externals.debug.js.map',
                    'dash.mediaplayer.debug.js', 'dash.mediaplayer.debug.js.map',
                    'dash.protection.debug.js', 'dash.protection.debug.js.map'
                ],
                dest: 'dist/',
                filter: 'isFile'
            }
        },
        exorcise: {
            build: {
                options: {},
                files: {
                    'build/temp/All.js.map': ['build/temp/All.js']
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
            build_all: {
                files: {
                    'build/temp/All.js': ['src/All.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'DashjsAll'
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
    grunt.registerTask('build',    ['clean', 'jshint', 'browserify:build_core', 'browserify:build_protection', 'browserify:build_all']);
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