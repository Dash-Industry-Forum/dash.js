Dash.js Test Framework

Prerequisites:

•   Install Node.js

•   npm install -g grunt-cli

•   Clone this repository

•   git submodule init

•   git submodule update --recursive

•   npm install

Grunt Integration:

The test framework has been integrated with grunt task runner to run the tests. The grunt.js file and package.json file has the configuration for the jshint and jasmine tasks. The jasmine framework has been used to develop the test cases. Please refer the config files.

Code Coverage:

•	Istanbul – This is current finalized framework. Appropriate configuration has added in the files to include code converage

Known Issues:

•	The test methods scenarios will be covered in depth in the subsequent check ins. All the test method failures have been fixed
•	The Grunt task integrated with code coverage plugin Istanbul might fail to run if not configured appropriately

Example development:

•   git checkout &lt;branch&gt;

•   git checkout -b &lt;alias&gt;/&lt;feature&gt;

•   git submodule update --recursive

•   git commit ...

•   git push origin &lt;alias&gt;/&lt;feature&gt;
