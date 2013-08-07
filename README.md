# dash.js

A reference client implementation for the playback of MPEG DASH via JavaScript and compliant browsers. Learn more about DASH IF Reference Client 

All new work should be in the development branch.  Master is now reserved to tag builds.

## Quick Start

Download 'master' or latest tagged release, extract and open main folder dash.js/index.html in your web browser to view the main test file. 

### Install Dependencies  
1. [install nodejs](http://nodejs.org/)
2. [install grunt](http://gruntjs.com/getting-started) 
	* npm install -g grunt-cli
3. [install grunt-template-jasmine-istanbul](https://github.com/maenu/grunt-template-jasmine-istanbul)
	* npm install grunt-template-jasmine-istanbul --save-dev
4. install some other dependencies:
	* npm install grunt-contrib-connect grunt-contrib-watch grunt-contrib-jshint grunt-contrib-uglify

### Build / Run tests:
```
grunt --config Gruntfile.js --force
```
