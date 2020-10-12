# Functional testing

This README explains how to run functional tests for dash.js project, based on Selenium and the Intern framework.
The tests can be executed using BrowserStack platform, meanwhile it details how to launch the functional tests locally on your desktop, using selenium grid.

## Intern
Proposed functional tests are based upon Intern framework (https://theintern.io/).
To install Intern, perform a ```npm install``` command in dash.js root folder.

## Web application for tests
To run the tests you have to serve a web application that is able to run the dash.js player.
This web application must declare the video element and the dash.js MediaPlayer instance, respectively with the ids ```'video'``` and ```'player'```.

## Tests scripts
The folder ```tests/functional``` contains the different functional tests suites for testing each functionality/scenario.
For example the suite in file ```test/play.js``` is used to test the ability to play a stream.

When writing a functional test, instead of executing application code directly, we do use the Leadfoot Command object, provided by the Intern framework, to automate interactions to test the application (see https://theintern.github.io/leadfoot/module-leadfoot_Command.html).
All the tests can then execute script source code within the test web application and then interact with the MediaPlayer instantiated in the web application.
The file ```tests/scripts/player.js``` provide a set of script functions to interact with the player.

Also in order to automate and check the tests results we do use the Chai Assertion Library (http://chaijs.com/) which is also bundled with Intern.

## Selenium and tests configuration
In ```config``` folder, you will multiple configurations files that are used by the ```runTests.js``` script to run tests:
- ```browsers.json``` provides the configuration for available browsers and CDMs for each platform (OSx and windows)
- ```applications.json``` provides the configuration for some web application that can be used to execute the tests

The script ```runTests.js``` is used to complete the intern and tests configuration, and to run the tests.

## Running tests on Windows
#### WebDrivers
In ```selenium``` folder, the following web drivers are available:
- Chrome
- Firefox
- Chromium Edge

#### Legacy Edge
Download the matching Edge driver (MicrosoftWebDriver) from https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/

For Edge version <=17 you need to adjust the "Dwebdriver.edge.driver" property in startClient.bat. 

For Version 18 and 19 follow the instructions in the link above and remove the "Dwebdriver.edge.driver" property and the MicrosoftWebDriver.exe in the selenium folder.

#### Launch the tests
1. Start selenium hub. Open a new terminal and launch the command:
```sh
cd test/functional/selenium
startHub.bat
```

2. Start selenium node. Open a new terminal and launch the command:
```sh
cd test/functional/selenium
startClient.bat
```

3. Start Intern runner. Open a new terminal and launch the command:
```sh
cd test/functional
./runTestsWin.bat
```

This last command contains a script for running tests on all browsers.
The script can be modified and executed (from project root folder) in order to run the tests (see ```runTests.js```):
- on specific browsers,
```sh
--browsers=<browser_names_separated_by_comma>
```
- on a specific testing web application
```sh
--app=<app_name_from_config_file> or --appurl=<app_url>
```
- using http or https protocol for accessing application and streams (https by default),
```sh
--protocol=<http or https>
```
- only for some specific suite of tests (Note: at least 'play' test is executed in order to retrieve stream metadata)
```sh
--testSuites=<test_suite_names_separated_by_comma>
```
- only for a specific stream or group of streams
```sh
--stream=<stream or group name>
```
- to specify reporters
```sh
--repoerters=<reporter_names_separated_by_comma>
```

For example:
- run all tests on chrome with pretty and junit reporters
```sh
node test/functional/runTests.js --os=windows --browsers=chrome --reporters=\"pretty,junit\"
```
- run only play and seek test suites
```sh
node test/functional/runTests.js --os=windows --browsers=chrome --testSuites=\"play,seek\"
```
- run all tests on stream "VOD (Static MPD) / SegmentBase, ondemand profile"
```sh
node test/functional/runTests.js --os=windows --browsers=chrome --stream=\"VOD (Static MPD) / SegmentBase, ondemand profile\"
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
cd test/functional/selenium
java -jar selenium-server-standalone-3.4.0.jar -role hub
```

2. Start selenium node. Open a new terminal and launch the command :
```sh
cd test/functional/selenium
java -jar selenium-server-standalone-3.4.0.jar -role node
```
3. Start Intern runner. Open a new terminal and launch the command:
```sh
cd test/functional
./runTestsMac.sh
```

As for Windows, the script can be modified to setup the tests.

#### Troubleshooting
Question: The localhost:3000 webserver is not available and all tests fail.  
Answer: A local webserver needs to run on port 3000. In order to launch a debug server launch the following command in the root folder of the project:
```
npm run dev
```

Question: The webserver responds with "cannot establish a secure connection"  
Answer: You need to install a local certificate to run the tests under https. Or you set the protocol to http as described above.
