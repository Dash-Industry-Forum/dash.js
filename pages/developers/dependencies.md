---
layout: default
title: Dependencies
parent: Developers
---

# Dependencies

dash.js relies on multiple other NPM packages to implement media player functionalities and for tasks related to
development. The dependencies are listed in `package.json` and are installed when running `npm install`.

## Direct Dependencies

| Package                      | Usage                                                                                |
|:-----------------------------|:-------------------------------------------------------------------------------------|
| `@svta/common-media-library` | Implements common media player functionalities such as ID3 parsing and CMCD encoding |
| `bcp-47-match`               | Match BCP 47 language tags with language ranges per RFC 4647                         |   
| `bcp-47-normalize`           | Normalize, canonicalize, and format BCP 47 tags                                      |   
| `codem-isoboxer`             | ISOBMFF box parser used to parse boxes such as `EMSG`                                |   
| `fast-deep-equal`            | Used to deep compare two objects                                                     |   
| `html-entities`              | Used to decoded HTML entities when playing in offline mode                           |   
| `imsc`                       | Library for rendering IMSC 1.0.1 and IMSC 1.1 documents to HTML5                     |   
| `localforage`                | Storage library used for offline playback                                            |   
| `path-browserify`            | Node path library used to extract and compare URLs                                   |   
| `ua-parser-js`               | Parsing library used to identify the browser and/or the underlying platform          |   

## Dev Dependencies

| Package                       | Usage                                                                                                   |
|:------------------------------|:--------------------------------------------------------------------------------------------------------|
| `@babel/core`                 | Required by babel-loader for Webpack and transpiling to ES5                                             |
| `@babel/eslint-parser`        | Allows ESLint to run on source code that is transformed by Babel.                                       |
| `@babel/preset-env`           | Required by babel-loader for Webpack and transpiling to ES5                                             |
| `babel-loader`                | Used for transpiling JavaScript by Webpack                                                              |
| `chai`                        | Assertion library used by the Karma testing framework                                                   |
| `chai-spies`                  | Addon plugin for the chai assertion library. It provides the most basic function spy ability and tests. |
| `clean-jsdoc-theme`           | Clean and fully responsive theme to generate the JSDoc.                                                 |
| `eslint`                      | Tool for identifying and reporting on patterns found in JavaScript code                                 |
| `eslint-webpack-plugin`       | Webpack plugin to run ESLint                                                                            |
| `karma`                       | Testrunner for unit and functional tests                                                                | |
| `karma-browserstack-launcher` | Launch tests on Browserstack via Karma                                                                  |
| `karma-chai`                  | Use asserts like "expect" from the chai library                                                         |
| `karma-chrome-launcher`       | Launches Chrome for unit and functional tests                                                           |
| `karma-coverage`              | Creates coverage report for unit tests                                                                  |
| `karma-firefox-launcher`      | Launches Firefox for unit and functional tests                                                          |
| `karma-htmlfile-reporter`     | Creates an HTML test report for functional tests                                                        |
| `karma-junit-reporter`        | Creates a JUnit test report for unit and functional test                                                |
| `karma-mocha`                 | Testframework for unit and functional tests                                                             |
| `karma-mocha-reporter`        | Mocha like test output for unit tests                                                                   |
| `karma-webdriver-launche`     | Run Karma tests using Webdriver. Required for test execution via Selenium                               |
| `karma-webpack`               | Webpack bundler for Karma testcases.                                                                    |
| `mocha`                       | JavaScript test framework for our unit and functional tests                                             |
| `rimraf`                      | Dependency to remove `dist` folder before building dash.js                                              |
| `sinon`                       | Standalone and test framework agnostic JavaScript test spies, stubs and mocks                           |
| `stream-browserify`           | The stream module from node core, for browsers                                                          |
| `string-replace-loader`       | Used to perform text replacements when building with webpack                                            |
| `typescript`                  | TypeScript adds optional types to JavaScript                                                            |
| `webpack`                     | Module bundler used to create the dash.js builds                                                        |
| `webpack-cli`                 | Allows setup of webpack custom configuration                                                            |
| `webpack-dev-server`          | Development server that uses webpack for bundling                                                       |
| `webpack-merge`               | Used to merge Webpack configuration files                                                               |
| `yargs`                       | Parses arguments provided via command line for execution of functional tests                            |
