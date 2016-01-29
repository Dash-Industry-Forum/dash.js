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
                    'dash.mediaplayer.debug.js', 'dash.mediaplayer.debug.js.map',
                    'dash.protection.debug.js', 'dash.protection.debug.js.map'
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
                        standalone: 'MediaPlayer'
                    },
                    plugin: [
                      ['browserify-derequire']
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
                        standalone: 'Protection'
                    },
                    plugin: [
                        ['browserify-derequire']
                    ],
                    transform: ['babelify']
                }
            },
            all: {
                files: {
                    'build/temp/dash.all.debug.js': ['src/All.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true,
                    },
                    plugin: [
                        ['browserify-derequire']
                    ],
                    transform: ['babelify']
                }
            },

            watch: {
                files: {
                    'build/temp/dash.all.debug.js': ['src/All.js']
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
        },
        githooks: {
            all: {
                'pre-commit': 'jscs'
            }
        }
    });

    require('load-grunt-tasks')(grunt);
    grunt.registerTask('default',   ['dist', 'test']);
    grunt.registerTask('dist',      ['clean', 'jshint', 'jscs', 'browserify:mediaplayer' , 'browserify:protection', 'browserify:all', 'minimize', 'copy:dist']);
    grunt.registerTask('minimize',  ['exorcise', 'uglify']);
    grunt.registerTask('test',      ['mocha_istanbul:test']);
    grunt.registerTask('watch',     ['browserify:watch']);
    grunt.registerTask('release',   ['default', 'jsdoc']);
    grunt.registerTask('debug', ['clean', 'browserify:all', 'exorcise:all', 'copy:dist']);
    grunt.registerTask('prepublish', ['githooks', 'dist']);
};
