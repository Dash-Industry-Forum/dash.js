module.exports = function (grunt) {
    require('time-grunt')(grunt);

    // Project configuration.
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
                src: ['build/temp/MediaPlayer.js', './externals/*.js'],
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
                    'build/temp/dash.all.min.js': 'build/temp/Dash.all.js'
                }
            },

            buildprotection: {
                options: {
                    sourceMap: true,
                    sourceMapIn: 'build/temp/Protection.js.map',
                    sourceMapRoot: './src/streaming/',
                    beautify: true,
                    compress: false,
                    mangle: false
                },
                files: {
                    'build/temp/dash.protection.min.js': 'build/temp/Protection.js',
                }

            },

            debug: {
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
            }
        },
        watch: {
            default: {
                files: ['src/**/*', 'Gruntfile.js'],
                tasks: 'dev'
            }
        },
        copy: {
            dist: {
                expand: true,
                cwd: 'build/temp/',
                src: ['dash.min.js', 'dash.min.js.map',
                      'dash.all.min.js', 'dash.all.min.js.map',
                      'dash.protection.min.js', 'dash.protection.min.js.map',
                      'dash.debug.js', 'dash.debug.js.map'],
                dest: 'dist/',
                filter: 'isFile'
            }
        },
        exorcise: {
            build: {
                options: {},
                files: {
                    'build/temp/MediaPlayer.js.map': ['build/temp/MediaPlayer.js'],
                    'build/temp/Protection.js.map': ['build/temp/Protection.js'],
                    'build/temp/Dash.all.js.map': ['build/temp/Dash.all.js']
                }
            }
        },
        browserify: {
            build: {
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
            buildprotection: {
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
    });

    // load all the npm grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.registerTask('build', [
      'clean:build',
      //'jshint', //TODO: lots of failures heres
        'browserify:build',
        'browserify:buildprotection',
        'concat:all'
    ]);

    grunt.registerTask('minimize', [
      'exorcise',
      'uglify'
    ]);

    grunt.registerTask('dist', [
      'clean:dist',
      'build',
      'minimize',
      'copy:dist'
    ]);

    grunt.registerTask('test', [
        'mocha_istanbul:test'
    ]);

    // Default task.
    //grunt.registerTask('default', [
    //  'dist',
    //  'test',
    //  'jsdoc'
    //]);

    //grunt.registerTask('watch', [
    //  'browserify:watch'
    //]);
};