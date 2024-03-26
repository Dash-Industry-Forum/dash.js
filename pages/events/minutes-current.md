---
layout: default
title: Meeting Minutes
parent: Meetings and Events
---

# Meeting Minutes

# 2024-02-27

* Time: 17:00 - 18:00 CET

## Participants
Will Law, Ali Begen, Caleb Hallier, Casey Occhialini, Matt Stephenson, Mike Dolan, Stephan Schreiner, Torbjörn Einarsson, Alex Giladi, Thomas Stockhammer, Daniel Silhavy

## General
* DASH + Fairplay: @Daniel to check with Thasso if Castlabs has any content
    * Talked to Thasso at MHV they can provide content
* @Daniel to prepare dash.js roadmap planing for one of the next IOP calls
* Potential contribution from Pluto for [Xlink@onRequest](mailto:XLink@onRequest)
    * @Daniel contacted Dan and Kevin again, waiting for feedback

## Version 4.7.4
* Released on 20 Feb
* Milestone: https://github.com/Dash-Industry-Forum/dash.js/milestone/61
* Release notes: https://github.com/Dash-Industry-Forum/dash.js/releases/tag/v4.7.4

## Version 5.0.0
* Project Board: https://github.com/orgs/Dash-Industry-Forum/projects/8/views/2
* Added Github action to deploy v5.0.0 branch to https://reference.dashif.org/dash.js/v5/samples/dash-if-reference-player/index.html

## General
* Merged changes from 4.7.4 into 5.0.0 branch
* Created two new v4 branches for potential minor additions and bugfixes to v4
    * V4_Development: https://github.com/Dash-Industry-Forum/dash.js/tree/v4_development
    * V4_Main: https://github.com/Dash-Industry-Forum/dash.js/tree/v4_main
* Going to merge v5.0.0 branch into development now
* New documentation for dash.js via Github pages: https://dashif.org/dash.js/
    * Dedicated branch to update markdown files: https://github.com/Dash-Industry-Forum/dash.js/tree/gh-pages
    * Question: What is the best way to host the markdown files:
        * As part of the development branch in a dedicated folder
            * Advantage would be to do a PR of a new feature together with the corresponding documentation
        * Dedicated gh-pages branch as of today

## Latest additions (see project board for all changes)
* Refactor CMSD implementation to use the Common Media Library's CMSD parser
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4351
* Enhanced EssentialProperty handling
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4385
    * Allow registering async functions in the custom capabilities filter: https://reference.dashif.org/dash.js/latest/samples/advanced/custom-capabilities-filters.html
    * CTA-WAVE has a mapping of EssentialProperty/Manifest information to MediaCapabilitiesAPI calls
    * Check CTA Playback Spec for detailed instructions. DASH profile for CMAF content
    * @Daniel: Check robustness of MediaCapabilitiesAPI 
* Parse ID3 payloads for inband events
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4391
* Improve the AbandonRequestsRule.js by using traces from progress event
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4369
* Refactor ABR rules and allow configuration of parameters via 
  * https://github.com/Dash-Industry-Forum/dash.js/pull/4373
* https://github.com/Dash-Industry-Forum/dash.js/pull/4378
* https://github.com/Dash-Industry-Forum/dash.js/pull/4379
* Support for @ref and @refid in ContentProtection elements
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4380
* Fix transition from unencrypted to encrypted periods
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4383
    * @Daniel: Create issue for that: Discussed with Thasso during MHV. To optimize this, we should synthesize an encrypted init segment and append that prior to the unencrypted init segment.

## Currently Ongoing
* New Reference UI
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4234
* Refactor BOLA rule and check for bugs
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4301
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4377
* Throughput calculation for low latency streams
    * https://github.com/Dash-Industry-Forum/dash.js/issues/3538
    * @Zafer, Ali, Daniel: Check this together
    * @Will: Side load previous segment to validate throughput
    * Assign high priority as people are using dash.js in production for low latency streaming
* Initial tests of current ABR behavior against ABR testbed
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4008

## Other items

### Common Media Library
* @Casey also working CEA-608 support for the CommonMediaLibrary
    * Port of existing code
* Montevideo summer camp
    * https://github.com/orgs/streaming-video-technology-alliance/projects/12 

### MWS
* Planning for dash.js face to face in Berlin co-located with MWS and DASH-IF face to face
    * https://www.fokus.fraunhofer.de/go/mws/
    * dash.js: June 10
    * MWS: June 11 and 12
    * DASH-IF: June 13 and 14

### Livesim2
* Support for ECCP
    * https://github.com/Dash-Industry-Forum/livesim2/pull/150
    * @Daniel: Add testvector to DASH-IF reference list

# 2024-01-16

* Time: 17:00 - 18:00 CET

* Participants: Ali, Casey, Will, Stephan, Tobbe, Bertrand, Daniel

## General
* Casey talking to Dan if they can provide DASH + Fairplay content
    * Not sure if any content available at this point
* Daniel to check with Thasso if Castlabs has any content
* Daniel to prepare dash.js roadmap planing for one of the next IOP calls
* Potential contribution from Pluto for XLink onRequest
    * Daniel contacted Dan and Kevin again, waiting for feedback

## Version 4.7.4
* Planned release date is the 30th January
* Milestone: https://github.com/Dash-Industry-Forum/dash.js/milestone/61

### Closed
* Add settings for IMSC rollUp and displayForcedOnly parameters. Previously those parameters were hardcoded
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4336
    * rollUp: new lines of text appear at the bottom of the screen and push the previous lines of text upward, creating a rolling effect.
    * displayForcedOnly: If and only if the value of displayForcedOnlyMode is "true", a content element with a itts:forcedDisplay computed value of "false" SHALL NOT produce any visible rendering
* Add API endpoint to trigger manifest refresh
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4330
* Include HTTP request range in data that is passed to modifyRequest callback
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4350
* Fix errors in Typescript definitions
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4348
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4349
* Fix invalid warning in StreamProcessor
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4355
* Remove Chrome workaround in CI/CD as there is a fix for the CircleCI browser tools plugin now
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4335
* Remove unused dependencies from the package.json
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4356

### In Progress
* Add support for downloadable font functionality as defined in DVB DASH
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4338
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4337
* Fix flickering/blinking of IMSC subtitles
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4359
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4358
* Add subtitle event handling for manual rendering of subtitles
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4360
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4317

### Open
* Update getting started guide and contribution guidelines
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4347
* Fix HbbTV testcases
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4328
* Rapid seeking causes playback to stall
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4318

## Version 5.0.0
* Project Board: https://github.com/orgs/Dash-Industry-Forum/projects/8/views/2
* Added Github action to deploy v5.0.0 branch to https://reference.dashif.org/dash.js/v5/samples/dash-if-reference-player/index.html

### General
* After release of version 4.7.4 merge changes from v5.0.0 branch to development and completely focus on this new version

### Latest additions (see project board for all changes)
* Use CommonMediaRequest and CommonMediaResponse classes from the SVTA Common Media Library. 
  * https://github.com/Dash-Industry-Forum/dash.js/pull/4299
* Allows us to use the RequestInterceptor and ResponseInterceptor methods

### Currently Ongoing
* Refactor CMSD implementation to use the Common Media Library's CMSD parser
    * https://github.com/Dash-Industry-Forum/dash.js/pull/4351
* New Reference UI
    * https://github.com/Dash-Industry-Forum/dash.js/issues/4234
* Merge latest changes from development into v5 branch
    * Requires a lot of manual work as we have lots of merge conflicts

### Others
* Stephan might be coming up with additional changes regarding EssentialProperty

## Other items
### Common Media Library
* SVTA issuing open call for suggesting work items and then prioritize the items afterwards
    * Open call still running, couple of items identified
        * Common Media Library accepted for Montevideo summer camp
        * Common ContentSteering model
* Ultimate goal: Get this integrated into open-source players e.g. dash.js and hls.js
    * Casey also working CEA-608 support for the CommonMediaLibrary
* Port of existing code
    * ID3 utilities in the CommonMediaLibrary, potential integration in dash.js. Would add additional functionality to dash.js.
    * Parse the payload of the emsg events
    * ID3 events can be detected via the schemeIdUri in the InbandEventStream
    * Casey. To issue a PR soon.

### MHV and SVTA Segments:2024
* dash.js presentation at Segments 2024
* Who is attending
    * Will (MHV), Ali (both), Casey (not sure), Guillaume, Christoph

### Livesim2
* Issue with the UTC timing element
    * https://github.com/Dash-Industry-Forum/livesim2/issues/147
    * Tobbe, Daniel: Check specification and continue discussion in Github issue
* Support for Clearkey
    * https://github.com/Dash-Industry-Forum/livesim2/issues/122
