# Description

The `functional-karma` testsuite implements functional tests using the Karma Testrunner. Functional tests are used to
test player functionality such as play, pause and seek.

# Structure

The source files are placed in multiple folders:

* `adapter`: Adapter classes that implement additional logic to run a test. For instance the `DashJsAdapter.js` serves
  as a wrapper around dash.js functionality.
* `config`: Test configuration files that define a set of testcases to be executed. The target configuration file is
  imported in `Utils.js`
* `content`: Contains static MPDs that serve as input for testcases.
* `helper`: Helper classes that define constant values and filter the relevant testvectors for a specific testcase.
* `results`: The summary of the test results is placed in this folder.
* `test`: The implementation of the testcases.
* `view`: Customized view for the test execution including a video element.

# Configuration

The main configuration for the test execution is defined in `karma.functional.conf.js`. To adjust the list of
testvectors or the testcases the existing `config/content.js` can be adjusted. As an alternative, include a different
configuration file in `helper/Utils.js`. Future additions to the test framework should allow definition of the testfile
to be used directly via command line parameters.

# Test Execution
To execute the functional tests run the following steps:

1. `npm install` to install all dependencies
2. `npm run build` to build the `dist` files of dash.js. 
3. `npm run test-functional-mocha` to execute the tests.
4. The results will be available after the test execution in `test/functional-karma/results`

