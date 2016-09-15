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
                    drop_console: false
                }
            },

            build_core: {
                options: {
                    sourceMapIn: 'build/temp/dash.mediaplayer.debug.js.map'
                },
                files: {
                    'build/temp/dash.mediaplayer.min.js': 'build/temp/dash.mediaplayer.debug.js'
                }
            },
            build_protection: {
                options: {
                    sourceMapIn: 'build/temp/dash.protection.debug.js.map'
                },
                files: {
                    'build/temp/dash.protection.min.js': 'build/temp/dash.protection.debug.js'
                }
            },

            build_reporting: {
                options: {
                    sourceMapIn: 'build/temp/dash.reporting.debug.js.map'
                },
                files: {
                    'build/temp/dash.reporting.min.js': 'build/temp/dash.reporting.debug.js'
                }
            },

            build_all: {
                options: {
                    sourceMapIn: 'build/temp/dash.all.debug.js.map'
                },
                files: {
                    'build/temp/dash.all.min.js': 'build/temp/dash.all.debug.js'
                }
            },

        },
        copy: {
            dist: {
                expand: true,
                cwd: 'build/temp/',
                src: [
                    'dash.all.min.js', 'dash.all.min.js.map',
                    'dash.mediaplayer.min.js', 'dash.mediaplayer.min.js.map',
                    'dash.protection.min.js', 'dash.protection.min.js.map',
                    'dash.all.debug.js', 'dash.all.debug.js.map',
                    'dash.reporting.min.js', 'dash.reporting.min.js.map',
                    'dash.mediaplayer.debug.js', 'dash.mediaplayer.debug.js.map',
                    'dash.protection.debug.js', 'dash.protection.debug.js.map',
                    'dash.reporting.debug.js', 'dash.reporting.debug.js.map'
                ],
                dest: 'dist/',
                filter: 'isFile'
            }
        },
        exorcise: {
            mediaplayer: {
                options: {},
                files: {
                    'build/temp/dash.mediaplayer.debug.js.map': ['build/temp/dash.mediaplayer.debug.js'],
                }
            },
            protection: {
                options: {},
                files: {
                    'build/temp/dash.protection.debug.js.map': ['build/temp/dash.protection.debug.js']
                }
            },
            all: {
                options: {},
                files: {
                    'build/temp/dash.all.debug.js.map': ['build/temp/dash.all.debug.js']
                }
            },
            reporting: {
                options: {},
                files: {
                    'build/temp/dash.reporting.debug.js.map': ['build/temp/dash.reporting.debug.js']
                }
            }
        },

        babel: {
            options: {
                sourceMap: true
            },
            es5: {
                files: [{
                    expand: true,
                    src: ['index.js', 'src/**/*.js', 'externals/**/*.js'],
                    dest: 'build/es5/',
                }]
            }
        },

        browserify: {
            mediaplayer: {
                files: {
                    'build/temp/dash.mediaplayer.debug.js': ['src/streaming/MediaPlayer.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'dashjs.MediaPlayer'
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: ['babelify']
                }
            },
            protection: {
                files: {
                    'build/temp/dash.protection.debug.js': ['src/streaming/protection/Protection.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'dashjs.Protection'
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: ['babelify']
                }
            },
            reporting: {
                files: {
                    'build/temp/dash.reporting.debug.js': ['src/streaming/metrics/MetricsReporting.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'dashjs.MetricsReporting'
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: ['babelify']
                }
            },
            all: {
                files: {
                    'build/temp/dash.all.debug.js': ['index.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: ['babelify']
                }
            },

            watch: {
                files: {
                    'build/temp/dash.all.debug.js': ['index.js']
                },
                options: {
                    watch: true,
                    keepAlive: true,
                    browserifyOptions: {
                        debug: true
                    },
                    plugin: [
                      ['browserify-derequire']
                    ],
                    transform: ['babelify']
                }
            }
        },
        jsdoc: {
            dist: {
                options: {
                    destination: 'docs/jsdoc',
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
            src: ['./src/**/*.js', 'Gruntfile.js'],
            options: {
                config: '.jscsrc'
            }
        },
        githooks: {
            all: {
                'pre-commit': 'lint'
            }
        }
    });

    require('load-grunt-tasks')(grunt);
    grunt.registerTask('default',   ['dist', 'test']);
    grunt.registerTask('dist',      ['clean', 'jshint', 'jscs', 'browserify:mediaplayer' , 'browserify:protection', 'browserify:reporting', 'browserify:all', 'babel:es5', 'minimize', 'copy:dist']);
    grunt.registerTask('minimize',  ['exorcise', 'uglify']);
    grunt.registerTask('test',      ['mocha_istanbul:test']);
    grunt.registerTask('watch',     ['browserify:watch']);
    grunt.registerTask('release',   ['default', 'jsdoc']);
    grunt.registerTask('debug',     ['clean', 'browserify:all', 'exorcise:all', 'copy:dist']);
    grunt.registerTask('lint',      ['jshint', 'jscs']);
    grunt.registerTask('prepublish', ['githooks', 'dist']);
};
