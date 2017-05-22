# Functional testing

This README explains how to run functional tests for dash.js project, based on Selenium and the Intern framework.
The tests can be executed using BrowserStack platform, meanwhile it details how to launch the functional tests locally on your desktop, using selenium grid.

## Intern
Proposed functional tests are based upon Intern framework (https://theintern.github.io/).
To install Intern, perform a ```npm install``` command in dash.js root folder.

## Web application for tests
To run the tests you have to serve a web application that is able to run the dash.js player.
This web application must declare the video element and the dash.js MediaPlayer instance, respectively with the ids ```'video'``` and ```'player'```.

## Tests scripts
The folder ```tests``` contains the different scripts for testing each functionnality/scenario.
For example the script ```test/play/play.js``` is testing the scenario for playing a stream.

When writing a functional test, instead of executing application code directly, we do use the Leadfoot Command object, provided by the Intern framework, to automate interactions to test the application (see https://theintern.github.io/leadfoot/module-leadfoot_Command.html).

Also in order to automate and check the tests results we do use the Chai Assertion Library (http://chaijs.com/) which is also bundled with Intern.

All the tests can interact with the video element and the MediaPlayer instance provided by the tested web application with the help of functions declared in ```test/video_functions.js``` and ```test/player_functions.js```

## Selenium and tests configuration
In ```config``` folder, you will multiple configurations files that are used by the ```testCommon.js``` script to run tests:
- ```selenium.js``` provides the configuration for the Selenium nodes configuration. Only 'local' configuration is provided so far
- ```os.js``` and ```browsers/*.js``` provides the available Selenium configurations for executing the tests on the different browsers on different platforms
- ```applications.js``` provides the configuration for some web application that can be used to execute the tests
- ```streams.json``` provides the streams configuration that can be used by the different tests
- ```testsConfig.js``` provides some configuration parameters for each test contained in ```tests``` folder
- ```testsSuites.js``` provides some suites of tests that can be run independently

## Running tests on Windows
#### WebDrivers
In ```tools``` folder, the following web drivers are available:
- Chrome
- Firefox
- Edge
- IE11

#### Launch the tests
1. Start selenium hub. Open a new terminal and launch the command:
```sh
cd test/functional/tools
startHub.bat
```

2. Start selenium node. Open a new terminal and launch the command:
```sh
cd test/functional/tools
startClient.bat
```

3. Start Intern runner. Open a new terminal and launch the command:
```sh
cd test/functional
./runTestsWin.bat
```

This last command contains a script for running tests on all browsers.
The script can be modified and executed (from project root folder) in order to run the tests:
- on specific browsers (see ```config/browsers/windows.js```),
```sh
browser=<browser_names_separated_by_comma>
```
- on a specific testing web application (see ```config/applications.js```)
```sh
app=<app_name_from_config_file> or appurl=<app_url>
```
- only for a specific suite of tests (see ```config/testsSuites.js```)
```sh
tests=<test_suites_names_separated_by_comma>
```

For example:
```sh
node node_modules/intern/runner.js config=test/functional/testsCommon.js os=windows browsers=chrome|firefox appurl=http://... tests=play
```

## Running tests on Mac OSX
#### Chrome
Download latest chrome driver (chromedriver) from https://sites.google.com/a/chromium.org/chromedriver/downloads
Make sure installation path is available in PATH variable.
You can follow this article : http://www.kenst.com/2015/03/installing-chromedriver-on-mac-osx/

#### Firefox
Download last firefox driver (geckodriver) from https://github.com/mozilla/geckodriver/releases
Make sure installation path is available in PATH variable.

#### Launch the tests
1. Start selenium hub. Open a new terminal and launch the command :
```sh
cd test/functional/tools
java -jar selenium-server-standalone-3.4.0.jar -role hub
```

2. Start selenium node. Open a new terminal and launch the command :
```sh
cd test/functional/tools
java -jar selenium-server-standalone-3.4.0.jar -role node
```
3. Start Intern runner. Open a new terminal and launch the command:
```sh
cd test/functional
./runTestsMac.sh
```

As for Windows, the script can be modified to setup the tests.

