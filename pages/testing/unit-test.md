---
layout: default
title: Unit Tests
parent: Testing
---

# Unit Tests

dash.js ships with various unit tests for validating the correct behavior of the functions in different classes.

## Structure

The unit tests are located in `test/unit` and divided into different folders:

- `config`: Contains the configuration files to execute the unit tests. dash.js uses
  the [Karma Testrunner](https://karma-runner.github.io/latest/index.html) to execute the unit tests directly in the
  browsers.
- `data`: Contains additional files like manifests, license responses and subtitle files to be used in the unit tests.
- `helpers`: Contains helper classes that contain common functionality used by the testfiles.
- `mocks`: Contains mock implementations of specific classes. When instantiating a class for a test, mock dependencies
  are injected to trigger a certain behavior.
- `results`: Contains the final results of the tests in JUnit format.
- `test`: Contains the concrete implementation of the testcases. The tests are divided into different folders based on
  the location of the source file to be tested.

## Execution

To execute the unit tests simply run `npm run test` in the root folder of dash.js. Per default, the tests are then
executed in Chrome and Firefox (running in headless mode). The result for each test is printed in the terminal. The
final result similar to this:

![controlbar]({{site.baseurl}}/assets/images/unit-tests-result.png)


