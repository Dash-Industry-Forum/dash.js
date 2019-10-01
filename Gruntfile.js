module.exports = function (grunt) {
    require('time-grunt')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        githash: {
            options: {
                fail: false
            },
            dist: {
            }
        },

        clean: {
            build: ['build/temp'],
            dist: ['dist/*']
        },
        jshint: {
            src: {
                src: ['src/**/*.js', 'test/unit/mocks/*.js', 'test/unit/*.js', 'Gruntfile.js'],
                options: {
                    jshintrc: '.jshintrc'
                }
            }
        },

        uglify: {
            options: {
                banner: '/*! v<%= pkg.version %>-<%= githash.dist.short %>, <%= grunt.template.today("isoUtcDateTime") %> */',
                sourceMap: {
                    includeSources: true,
                    root: './src/'
                },
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

            build_mss: {
                options: {
                    sourceMapIn: 'build/temp/dash.mss.debug.js.map'
                },
                files: {
                    'build/temp/dash.mss.min.js': 'build/temp/dash.mss.debug.js'
                }
            },

            build_all: {
                options: {
                    sourceMapIn: 'build/temp/dash.all.debug.js.map'
                },
                files: {
                    'build/temp/dash.all.min.js': 'build/temp/dash.all.debug.js'
                }
            }
        },
        browserSync: {
            bsFiles: {
                src: ['dist/*.js', 'samples/**/*', 'contrib/**/*', 'externals/**/*.js']
            },
            options: {
                watchTask: true,
                host: 'localhost',
                server: {
                    baseDir: './',
                    directory: true
                },
                startPath: '/samples/index.html',
                plugins: [
                    {
                        module: 'bs-html-injector',
                        options: {
                            files: 'samples/**/*.html'
                        }
                    }
                ]
            }
        },
        copy: {
            dist: {
              files: [{
                expand: true,
                cwd: 'build/temp/',
                src: [
                    'dash.all.min.js', 'dash.all.min.js.map',
                    'dash.mediaplayer.min.js', 'dash.mediaplayer.min.js.map',
                    'dash.protection.min.js', 'dash.protection.min.js.map',
                    'dash.all.debug.js', 'dash.all.debug.js.map',
                    'dash.reporting.min.js', 'dash.reporting.min.js.map',
                    'dash.mss.min.js', 'dash.mss.min.js.map',
                    'dash.mediaplayer.debug.js', 'dash.mediaplayer.debug.js.map',
                    'dash.protection.debug.js', 'dash.protection.debug.js.map',
                    'dash.reporting.debug.js', 'dash.reporting.debug.js.map',
                    'dash.mss.debug.js', 'dash.mss.debug.js.map'
                ],
                dest: 'dist/',
                filter: 'isFile'
            }, {
                expand: true,
                cwd: '.',
                src: 'index.d.ts',
                dest: 'dist/',
                rename: function (dest) {
                    return dest + 'dash.d.ts';
                }
            }, {
                expand: true,
                cwd: '.',
                src: 'index.d.ts',
                dest: 'build/typings/'
            }]
          }
        },
        exorcise: {
            mediaplayer: {
                options: {
                    base: './src'
                },
                files: {
                    'build/temp/dash.mediaplayer.debug.js.map': ['build/temp/dash.mediaplayer.debug.js']
                }
            },
            protection: {
                options: {
                    base: './src'
                },
                files: {
                    'build/temp/dash.protection.debug.js.map': ['build/temp/dash.protection.debug.js']
                }
            },
            all: {
                options: {
                    base: './src'
                },
                files: {
                    'build/temp/dash.all.debug.js.map': ['build/temp/dash.all.debug.js']
                }
            },
            reporting: {
                options: {
                    base: './src'
                },
                files: {
                    'build/temp/dash.reporting.debug.js.map': ['build/temp/dash.reporting.debug.js']
                }
            },
            mss: {
                options: {
                    base: './src'
                },
                files: {
                    'build/temp/dash.mss.debug.js.map': ['build/temp/dash.mss.debug.js']
                }
            }
        },

        babel: {
            options: {
                sourceMap: true,
                compact: true,
                presets: ['env']
            },
            es5: {
                files: [{
                    expand: true,
                    src: ['index.js', 'index_mediaplayerOnly.js', 'src/**/*.js', 'externals/**/*.js'],
                    dest: 'build/es5/'
                }]
            }
        },

        browserify: {
            mediaplayer: {
                files: {
                    'build/temp/dash.mediaplayer.debug.js': ['index_mediaplayerOnly.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: [['babelify', {compact: false}]]
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
                    transform: [['babelify', {compact: false}]]
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
                    transform: [['babelify', {compact: false}]]
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
                    transform: [['babelify', {compact: false}]]
                }
            },
            mss: {
                files: {
                    'build/temp/dash.mss.debug.js': ['src/mss/index.js']
                },
                options: {
                    browserifyOptions: {
                        debug: true
                    },
                    plugin: [
                        'browserify-derequire', 'bundle-collapser/plugin'
                    ],
                    transform: [['babelify', {compact: false}]]
                }
            },

            watch: {
                files: {
                    'build/temp/dash.all.debug.js': ['index.js'],
                    'build/temp/dash.mss.debug.js': ['src/mss/index.js']
                },
                options: {
                    watch: true,
                    keepAlive: true,
                    browserifyOptions: {
                        debug: true
                    },
                    plugin: [
                        'browserify-derequire'
                    ],
                    transform: [['babelify', {compact: false}]]
                }
            },
            watch_dev: {
                files: {
                    'dist/dash.all.debug.js': ['index.js'],
                    'dist/dash.mss.debug.js': ['src/mss/index.js']
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
                    transform: [['babelify', {compact: false}]]
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
                src: './test/unit',
                options: {
                    mask: '*.js',
                    coverageFolder: './reports',
                    mochaOptions: ['--compilers', 'js:babel/register'],
                    print: 'both',
                    reportFormats: ['lcov'],
                    root: './src'
                }
            }
        },
        jscs: {
            src: ['./src/**/*.js', 'test/unit/mocks/*.js', 'test/unit/*.js', 'Gruntfile.js'],
            options: {
                config: '.jscsrc'
            }
        },
        githooks: {
            all: {
                'pre-commit': 'lint'
            }
        },
        'string-replace': {
            dist: {
                files: {
                    './samples/dash-if-reference-player/index.html': './samples/dash-if-reference-player/index.html'
                },
                options: {
                    replacements: [{
                        pattern: '<!-- commit-info -->',
                        replacement: !grunt.option('git-commit') ? '' : '(development, commit: <a href="https://github.com/Dash-Industry-Forum/dash.js/commit/' + grunt.option('git-commit') + '">' + grunt.option('git-commit').toString().substring(0, 8) + ')</a>'
                    }]
                }
            }
        },
        ftp_push: {
            deployment: {
                options: {
                    host: grunt.option('ftp-host'),
                    dest: '/',
                    username: grunt.option('ftp-user'),
                    password: grunt.option('ftp-pass'),
                    hideCredentials: true,
                    // disabling incrementalUpdates because this option is not working fine
                    incrementalUpdates: false,
                    debug: true,
                    port: 21
                },
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            'contrib/**',
                            'dist/**',
                            'test/functional/tests.html',
                            'test/functional/testsCommon.js',
                            'test/functional/config/**',
                            'test/functional/tests/**',
                            'samples/**'
                        ]
                    }
                ]
            }
        }
    });

    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.registerTask('default', ['dist', 'test']);
    grunt.registerTask('dist', ['clean', 'jshint', 'jscs', 'browserify:mediaplayer', 'browserify:protection', 'browserify:reporting', 'browserify:mss', 'browserify:all', 'babel:es5', 'minimize', 'copy:dist']);
    grunt.registerTask('minimize', ['exorcise', 'githash', 'uglify']);
    grunt.registerTask('test', ['mocha_istanbul:test']);
    grunt.registerTask('watch', ['browserify:watch']);
    grunt.registerTask('watch-dev', ['browserify:watch_dev']);
    grunt.registerTask('release', ['default', 'jsdoc']);
    grunt.registerTask('debug', ['clean', 'browserify:all', 'exorcise:all', 'copy:dist']);
    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('prepublish', ['githooks', 'dist']);
    grunt.registerTask('dev', ['browserSync', 'watch-dev']);
    grunt.registerTask('deploy', ['string-replace', 'ftp_push']);
};
