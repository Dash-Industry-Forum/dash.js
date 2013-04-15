Dash.js Test Framework

Prerequisites:

Chrome developer version to run the tests
JSCoverage.exe installed with the PATH variable set
Phanthom.exe installed with PATH variable set

Test Framework:

This is a test framework to automate the testing of dash.js framework on chrome browser. The classes targeted for the initial framework setup are:
•	DashParser.js 
•	DashHandler.js
•	DashManifestExtensions.js

Grunt Integration:

The test framework has been integrated with grunt task runner to run the tests. The grunt.js file and package.json file needs to be updated accordingly with the configuration to match and run the tasks. In this case, jasmine framework has been used to develop the test cases and this task will be set up in the grunt.js file. Please refer the config files.

Code Coverage:

To get code coverage, the following 3 tools were shortlisted:
•	Jasmine-coverage – Only compatible with 0.3.0 version of grunt and hence cannot be used as the current target framework is 0.4.1
•	Grunt-Qunit-Cov – Currently throwing an error when installed through npm
•	Istanbul – This is current finalized framework. Appropriate configuration has added in the files to include code converage

Known Issues:

The code architecture is still in flux and will undergo changes. Currently known issues are:
•	The test methods scenarios will be covered in depth in the coming check ins. All the test method failures have been fixed
•	The Grunt task integrated with code coverage plugin Istanbul might fail to run if not configured appropriately
