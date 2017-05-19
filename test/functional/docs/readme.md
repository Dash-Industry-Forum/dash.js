# Functional testing

This file explains how to start functional tests locally.

## Intern

Functional tests are base upon Intern framework (https://theintern.github.io/).
For the moment, they are launched locally, using selenium grid. 

using InternJS , they can be although been launched using BrowserStack.

To install Intern, you'll need to perform a 'npm install' command in root folder of Dash.js sources.

## Mac OSX

On Mac OSX, tests are available on browsers : 

- Chrome
- Firefox

#### Chrome

Download last chrome driver (chromedriver) from https://sites.google.com/a/chromium.org/chromedriver/downloads
Make sure installation path is available in PATH variable.

You can follow this article : http://www.kenst.com/2015/03/installing-chromedriver-on-mac-osx/

#### Firefox

Download last firefox driver (geckodriver) from https://github.com/mozilla/geckodriver/releases
Make sure installation path is available in PATH variable.

#### Running the tests

You must have a local HTTP server, serving tests.hml fil from test/functional/tests.html
Once installed, you are ready to start testing : 

First start selenium hub.
Open a terminal and launch the command :

```sh
cd test/functional/tools
java -jar selenium-server-standalone-3.4.0.jar -role hub
```

Then start selenium hub. 
Open a terminal and launch the command : 

```sh
cd test/functional/tools
java -jar selenium-server-standalone-3.4.0.jar -role node
```

Update test/functional/runTestMac.sh file to point on local url to tests.html file.
Finally, start internjs runner :
```sh
cd test/functional
./runTestsMac.sh
```

The tests will start on chrome and firefox.

To test in a specific browser you can type following commands, from root : 
```sh
node node_modules/intern/runner.js config=test/functional/testsCommon.js os=mac browsers=firefox|chrome url='URL of tests.html file'
```

## Windows

On Windows, tests are available on browsers : 

- Chrome
- Firefox
- Edge
- IE11

Uses webdrivers are available in tools folder

#### Running the tests

You must have a local HTTP server, serving tests.hml fil from test/functional/tests.html
Once installed, you are ready to start testing : 

First start selenium hub.
Open a terminal and launch the command :

```sh
cd test/functional/tools
startHub.bat
```

Then start selenium hub. 
Open a terminal and launch the command : 

```sh
cd test/functional/tools
startClient.bat
```

Update test/functional/runTestMac.sh file to point on local url to tests.html file.
Finally, start internjs runner :
```sh
cd test/functional
./runTestsWin.bat
```

The tests will start on all browsers.

To test in a specific browser you can type following commands, from root : 
```sh
node node_modules/intern/runner.js config=test/functional/testsCommon.js os=windows browsers=firefox|chrome|edge|ie url='URL of tests.html file'
```