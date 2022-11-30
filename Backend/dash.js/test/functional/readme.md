# Functional testing

This README explains how to run functional tests for dash.js project, based on Selenium and the Intern framework.
The tests can be executed using BrowserStack platform, meanwhile it details how to launch the functional tests locally on your desktop, using selenium grid.

## Intern
Proposed functional tests are based upon Intern framework (https://theintern.io/).
To install Intern, perform a ```npm install``` command in dash.js root folder.

## Web application for tests
To run the tests, you have to serve a web application that is able to run the dash.js player.
This web application must declare the video element and the dash.js MediaPlayer instance, respectively with the ids ```'video'``` and ```'player'```.

The sample application ```samples/functional-tests/index.html``` provides an example of such as application which is used by default to run the tests.

By default, the web application https://reference.dashif.org/dash.js/nightly/samples/functional-tests/index.html is loaded for executing the tests.

## Tests scripts
The folder ```/test/functional``` contains the different functional tests suites for testing each playback functionality/scenario.
For example the suite in file ```tests/play.js``` is used to test the ability to play a stream.

When writing a functional test, instead of executing application code directly, we do use the Leadfoot Command object, provided by the Intern framework, to automate interactions to test the application (see https://theintern.github.io/leadfoot/module-leadfoot_Command.html).
All the tests can therefore execute script source code within the test web application and then interact with the MediaPlayer and/or HTML video element instantiated in the web application.

The file ```tests/scripts/player.js``` provide a set of script functions to interact with the dahs.js MediaPlayer.
The file ```tests/scripts/video.js``` provide a set of script functions to interact with the HTML video element.

Also in order to automate and check the tests results we do use the Chai Assertion Library (http://chaijs.com/) which is also bundled with Intern.

## Selenium and tests environment/configuration
In ```config``` folder, you will find configurations files that are used by the ```runTests.js``` script to configure tests execution environment:
- ```browsers.json``` provides the configuration for available browsers and CDMs for each platform (Windows and Mac)
- ```applications.json``` provides the configuration for some web application that can be used to execute the tests

The script ```runTests.js``` is used to complete the intern and tests environment and configuration, and to run the tests.

## Running test on local desktop

### WebDrivers

According to the browser(s) on which you want to execute the tests, you need to download the browser's web driver.

Download and copy the appropriate drivers (browser and version) in the ```selenium``` folder.

#### Chrome driver
Download the latest chrome driver from https://chromedriver.chromium.org/

#### Firefox driver
Download the latest Firefox (geckodriver) driver from https://github.com/mozilla/geckodriver/releases

#### Edge driver
Download the matching Edge driver (MicrosoftWebDriver) from https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/

For Edge version <=17 you need to adjust the "Dwebdriver.edge.driver" property in Selenium node configuration (see next section). 

For Version 18 and 19 follow the instructions in the link above and remove the "Dwebdriver.edge.driver" property and the MicrosoftWebDriver.exe in the selenium folder.

### Selenium

Before executing tests on your local desktop you need to run Selenium grid:

1. Start selenium hub. Open a new terminal at folder ```selenium``` and launch the command:
```sh
> java -jar selenium-server-standalone-3.4.0.jar -role hub
```

2. Start selenium node. Open a new terminal at folder ```selenium``` and launch the command:
```sh
> java -jar selenium-server-standalone-3.4.0.jar -role node
```
On Windows you need to provide the node configuration:
```sh
> java -jar selenium-server-standalone-3.4.0.jar -role node -nodeConfig Win10nodeConfig.json
```

When using driver for Edge version <=17 you need to adjust the "Dwebdriver.edge.driver" property in Selenium node configuration. 

```sh
> java -jar selenium-server-standalone-3.4.0.jar -role node -nodeConfig Win10nodeConfig.json -Dwebdriver.edge.driver="msedgedriver.exe" 
```

## Executing the tests

To execute the tests you need to launch the intern runner. Open a new terminal at project root folder and launch the command:
```sh
> node test/functional/runTests.js
```

For the list fo available options run:
```sh
> node test/functional/runTests.js --help
```

The available options for running the tests are:
```sh
runTests.js [options]

Options:
      --selenium    The selenium configuration preset name
                                 [choices: "local", "remote"] [default: "local"]
      --reporters   Reporters types (separated by ",", see intern.io
                    documentation)                           [default: "pretty"]
      --os          The OS platform on which tests must be executed (for test on
                    local desktop, os is detected)
                                [choices: "windows", "mac"] [default: "windows"]
      --browsers    Browser names among "chrome", "firefox" and "edge"
                    (separated by ",")                       [default: "chrome"]
      --app         Application names
                                 [choices: "local", "remote"] [default: "local"]
      --protocol    The http protocol for loading application
                                   [choices: "https", "http"] [default: "https"]
      --testSuites  The test suites names ("play", "playFromTime", "pause", ...)
                    to execute (separated by ",")               [default: "all"]
      --streams     Name filter for streams to be tested        [default: "all"]
      --debug       Output log/debug messages       [boolean] [default: "false"]
```

Note: for complete of available reporters refer to Intern documentation: https://theintern.io/docs.html#Intern/4/api/lib%2Fcommon%2Fconfig/reporters

As an example, to execute tests:
  - using remote selenium (Browserstack)
  - using junit reporter
  - on windows platform
  - with firefox
  - using remote application (integrating nightly build of dash.js)
  - using https (to enable playback of DRM protected streams)
  - play and pause tes suites only
  - for streams in the group "DRM (mordern)"

Windows example command:
```sh
> node .\test\functional\runTests.js --selenium=remote --os=windows --browsers=firefox --app=remote --protocol=https --reporters=junit --testSuites="play,pause" --streams="DRM (modern)"
```

Mac example command:
```
node test/functional/runTests.js --selenium=local --os=mac --browsers=chrome --app=local --protocol=http --reporters=junit --testSuites="textSwitch" --mpd="https://livesim.dashif.org/dash/vod/testpic_2s/multi_subs.mpd"
```

#### Troubleshooting

\# Question: The localhost:3000 webserver is not available and all tests fail.  
Answer: A local webserver needs to run on port 3000 when using local application. In order to launch local server that serves debug version of dash.js launch the following command in the root folder of the project:
```
npm run dev
```

\# Question: The webserver responds with "cannot establish a secure connection"  
Answer: You need to install a local certificate to run the tests under https. Or you set the protocol to http as described above.
