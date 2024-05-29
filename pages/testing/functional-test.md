---
layout: default
title: Functional Tests
parent: Testing
---

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# Functional Tests

Functional testing in the context of media players refers to the process of testing the functionality and behavior of a
media player. It involves verifying that the media player performs its intended tasks correctly, such as playing various
types of media files (e.g. DASH manifests and segments), managing playback (e.g. play, pause, seek) and
controlling external events (e.g. a user induced switch of the audio or subtitle language). Ideally, the functionality
of a media player can be completely tested in an automated fashion obsoleting the need to perform time-consuming and
resource-consuming manual tests.

## Functional Tests in dash.js

A single functional test in dash.js typically consists of multiple steps and test-assertions:

````js
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.PLAY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
````

In the example above the player is initialized and the playback is triggered. The test passes if the player successfully
transitions to the playing state and the playback time is progressing. Moreover, no critical errors shall be thrown.

## Structure

The functional tests are located in `test/functional` and are divided into different folders:

- `adapter`: The tests are implemented in a generic fashion enabling different media players to be
  plugged in. The concrete implementation of the player interfaces is realized through adapter classes located in this
  folder. As an example, the `DashJsAdapter` class implements the required functions to control dash.js.
- `config`: This folder contains the test configuration files. The functional tests are executed through
  the [Karma Testrunner](https://karma-runner.github.io/latest/index.html). The configuration for the Karma Testrunner
  is located in `karma.functional.conf.cjs`. The streams to be tested are located in
  dedicated JSON files in the `streams` subfolder. In addition, example configurations for executing the tests locally
  and on Browserstack are provided.
- `content`: Locally hosted content files that are used by the testcases. As an example, this folder contains manifest
  files with missing segments to create a gap in the media buffer.
- `results`: Contains the results of the testruns in HTML and JUnit format.
- `src`: Utility functions and classes used in the test implementations.
- `test`: Implementation of the testcases. The testfiles are divided into different folders depending on the
  functionality they are verifying. For instance, tests related to subtitles and captions are located in the `text`
  folder.
- `view`: Contains the landing page that is launched by the Karma Testrunner for the execution of the tests.

## Execution

### Via Karma

The execution of the functional testsuite is straight forward. Simply start Karma with the required configuration
options:

`karma start test/functional/config/karma.functional.conf.cjs --configfile=local --streamsfile=smoke`

* `test/functional/config/karma.functional.conf.cjs`: The Karma configuration file
* `--configfile=local`: Path to the test configuration file to define which browsers should be used for test execution
  and
  how the test reports should be saved. The path is relative to `test/functional/config/test-configurations`
* `--streamsfile=smoke`: Path to the streams configuration file defining the streams to be used.

## Example Configurations

dash.js ships with predefined configuration files. They are located in `test/functional/config/test-configurations`.

## Supported Testcases

| Testcase                                 | Description                                                                                                                                                   |
|:-----------------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `advanced/no-reload-after-seek`          | Build up a backwards buffer and then seek into the backwards buffer range. Expect no redundant segment downloads for segments that are already in the buffer. |
| `advanced/seek-in-gaps`                  | Checks playback of MPDs that contain gaps in the timeline or create gaps in the media buffer. The player should recover from such situations.                 |
| `audio/initial-audio`                    | Define an initial audio language and expect the player to choose this language at playback start.                                                             |
| `audio/switch-audio`                     | Switch the audio language during playback and expect the player to download the right media segments.                                                         |
| `buffer/buffer-cleanup`                  | Play the stream for some time and expect the buffer level to stay withing the predefined tolerance.                                                           |
| `buffer/initial-buffer-target`           | Set an initial buffer target and expect the player to build the buffer before starting playback.                                                              |
| `feature-support/cmcd`                   | Checks if CMCD parameters are included in outgoing segment requests if enabled.                                                                               |
| `feature-support/emsg-triggered`         | Checks if EMSG events are correctly parsed and dispatched to the application.                                                                                 |
| `feature-support/mpd-patching`           | Checks if two consecutive manifest updates are of type Patch                                                                                                  |
| `live/latency-catchup`                   | Expect the player to apply the catchup logic to stick to a certain latency if enabled.                                                                        |
| `live/live-delay`                        | Expect the live delay to correspond to the initial settings.                                                                                                  |
| `playback/ended`                         | Expect the ended event to be thrown once playback is finished.                                                                                                |
| `playback/pause`                         | Expect the player to correctly pause playback.                                                                                                                |
| `playback/play`                          | Expect the player to correctly trigger playback.                                                                                                              |
| `playback/seek`                          | Expect the player to correctly seek to a target time.                                                                                                         |
| `playback-advanced/attach-at-non-zero`   | Check if the player uses the starttime provided via the `attachSource()` function                                                                             |
| `playback-advanced/attach-with-posix`    | Check if the player uses the starttime provided in `posix` format to `attachSource()`                                                                         |
| `playback-advanced/cmcd`                 | Enable CMCD reporting and expect the media segment requests to have CMCD parameters.                                                                          |
| `playback-advanced/mpd-anchor`           | Use MPD anchors to define a starttime.                                                                                                                        |
| `playback-advanced/multiperiod-playback` | Verify that the player transitions to a new period when playing a multiperiod MPD.                                                                            |
| `playback-advanced/preload`              | Preload media segments to a virtual buffer before a video element is attached to the player.                                                                  |
| `text/initial-text`                      | Set an initial language for the selection of a texttrack and expect the player to respect that setting.                                                       |
| `text/switch-text`                       | Switch the texttrack during playback and expect the player to download the right track.                                                                       |
| `vendor/google-ad-manager-emsg`          | Check the working integration of the Google Ad Manager                                                                                                        |
| `video/switch-video`                     | Switch to a different video track e.g. switching between AdaptationSets with different codecs.                                                                |

