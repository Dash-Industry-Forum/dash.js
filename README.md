# dash.js

A reference client implementation for the playback of MPEG DASH via JavaScript and compliant browsers. Learn more about DASH IF Reference Client 

Current version is now in Master, rather than dev.

## Quick Start

Download 'master' or latest tagged release, extract and put the contents of the dash.js folder on a webserver.
An easy way to do this is to run 
```
python -m SimpleHTTPServer 
```
in the dash.js folder and then open [http://127.0.0.1:8000/index.html](http://127.0.0.1:8000/index.html) in your browser (currently only Chrome is supported) to view the main test file. 
### Install Dependencies (only needed for development) 
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

