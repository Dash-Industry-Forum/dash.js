---
title: Dependencies
---

# Dependencies

dash.js relies on multiple other NPM packages to implement media player functionalities and for tasks related to
development. The dependencies are listed in `package.json` and are installed when running `npm install`.

## Direct Dependencies

| Package             | Usage                                                                                                                    |
|:--------------------|:--------------------------------------------------------------------------------------------------------------------------|
| `@svta/cml-608`     | Parsing of CEA-608 embedded captions                                                                                     |
| `@svta/cml-cmcd`    | CMCD (Common Media Client Data) encoding                                                                                 |
| `@svta/cml-cmsd`    | CMSD (Common Media Server Data) parsing                                                                                  |
| `@svta/cml-dash`    | Common DASH utilities, e.g. for segment handling                                                                         |
| `@svta/cml-id3`     | Parsing of ID3 timed metadata                                                                                            |
| `@svta/cml-request` | `CommonMediaRequest`/`CommonMediaResponse` types used by the HTTP loading stack and the network interceptor API          |
| `@svta/cml-xml`     | XML parsing used by the manifest parser                                                                                  |
| `bcp-47-match`      | Match BCP 47 language tags with language ranges per RFC 4647                                                             |
| `codem-isoboxer`    | ISOBMFF box parser used to parse boxes such as `EMSG`                                                                    |
| `fast-deep-equal`   | Used to deep compare two objects                                                                                         |
| `html-entities`     | Used to decode HTML entities when playing in offline mode                                                                |
| `imsc`              | Library for rendering IMSC 1.0.1 and IMSC 1.1 documents to HTML5                                                         |
| `localforage`       | Storage library used for offline playback                                                                                |
| `path-browserify`   | Node path library used to extract and compare URLs                                                                       |

## Dev Dependencies

| Package                                      | Usage                                                                                                   |
|:---------------------------------------------|:--------------------------------------------------------------------------------------------------------|
| `@babel/core`                                | Required by babel-loader for Webpack and transpiling to ES5                                             |
| `@babel/eslint-parser`                       | Allows ESLint to run on source code that is transformed by Babel                                        |
| `@babel/plugin-transform-parameters`         | Transforms ES2015 parameters to ES5 as part of the Webpack process                                      |
| `@babel/plugin-transform-runtime`            | A plugin that enables the re-use of Babel's injected helper code to save on codesize                    |
| `@babel/preset-env`                          | Required by babel-loader for Webpack and transpiling to ES5                                             |
| `@babel/runtime`                             | Babel's runtime helpers referenced by the transpiled legacy build                                       |
| `@chiragrupani/karma-chromium-edge-launcher` | An Edge launcher for Karma that is used for executing functional tests in the Edge browser              |
| `@eslint/js`                                 | ESLint JavaScript language implementation                                                               |
| `babel-loader`                               | Used for transpiling JavaScript by Webpack                                                              |
| `babel-plugin-istanbul`                      | Instruments the source code for unit test coverage reports                                              |
| `buffer`                                     | Node `Buffer` polyfill for the browser bundles                                                          |
| `chai`                                       | Assertion library used by the Karma testing framework                                                   |
| `chai-spies`                                 | Addon plugin for the chai assertion library. It provides the most basic function spy ability and tests  |
| `clean-jsdoc-theme`                          | Clean and fully responsive theme to generate the JSDoc                                                  |
| `concurrently`                               | Runs the modern and legacy Webpack builds in parallel                                                   |
| `core-js`                                    | Modular standard library for JavaScript to polyfill ECMAScript features                                 |
| `es-check`                                   | Verifies that the built bundles conform to the targeted ECMAScript versions                             |
| `eslint`                                     | Tool for identifying and reporting on patterns found in JavaScript code                                 |
| `globals`                                    | Global identifiers from different JavaScript environments                                               |
| `jsdoc`                                      | Generates the API documentation from the JSDoc comments in the source code                              |
| `karma`                                      | Testrunner for unit and functional tests                                                                |
| `karma-browserstack-launcher`                | Launch tests on Browserstack via Karma                                                                  |
| `karma-chai`                                 | Use asserts like "expect" from the chai library                                                         |
| `karma-chrome-launcher`                      | Launches Chrome for unit and functional tests                                                           |
| `karma-coverage`                             | Creates coverage report for unit tests                                                                  |
| `karma-firefox-launcher`                     | Launches Firefox for unit and functional tests                                                          |
| `karma-htmlfile-reporter`                    | Creates an HTML test report for functional tests                                                        |
| `karma-junit-reporter`                       | Creates a JUnit test report for unit and functional test                                                |
| `karma-mocha`                                | Testframework for unit and functional tests                                                             |
| `karma-mocha-reporter`                       | Mocha like test output for unit tests                                                                   |
| `karma-safarinative-launcher`                | Launches Safari for test execution on macOS                                                             |
| `karma-webpack`                              | Webpack bundler for Karma testcases                                                                     |
| `mermaid`                                    | Renders the architecture diagrams in this documentation                                                 |
| `mocha`                                      | JavaScript test framework for our unit and functional tests                                             |
| `nise`                                       | Fake XHR/server implementations used in unit tests                                                      |
| `publint`                                    | Lints `package.json` and the published package for packaging errors                                     |
| `rimraf`                                     | Dependency to remove `dist` folder before building dash.js                                              |
| `sinon`                                      | Standalone and test framework agnostic JavaScript test spies, stubs and mocks                           |
| `stream-browserify`                          | The stream module from node core, for browsers                                                          |
| `string-replace-loader`                      | Used to perform text replacements when building with webpack                                            |
| `timers-browserify`                          | Adds support for the timers module to browserify                                                        |
| `typescript`                                 | TypeScript adds optional types to JavaScript; used to verify `index.d.ts`                               |
| `vitepress`                                  | Static site generator used to build this documentation site                                             |
| `vitepress-plugin-mermaid`                   | Mermaid diagram support for the documentation site                                                      |
| `webpack`                                    | Module bundler used to create the dash.js builds                                                        |
| `webpack-cli`                                | Allows setup of webpack custom configuration                                                            |
| `webpack-dev-server`                         | Development server that uses webpack for bundling                                                       |
| `webpack-merge`                              | Used to merge Webpack configuration files                                                               |
| `yargs`                                      | Parses arguments provided via command line for execution of functional tests                            |
