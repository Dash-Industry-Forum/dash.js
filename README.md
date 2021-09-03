
<img src="https://cloud.githubusercontent.com/assets/2762250/7824984/985c3e76-03bc-11e5-807b-1402bde4fe56.png" width="400">

Build status (CircleCI): [![CircleCI](https://circleci.com/gh/Dash-Industry-Forum/dash.js/tree/development.svg?style=svg)](https://circleci.com/gh/Dash-Industry-Forum/dash.js/tree/development)

[Join #dashjs on Slack!](https://join.slack.com/t/dashif/shared_invite/zt-egme869x-JH~UPUuLoKJB26fw7wj3Gg)

## News

### dash.js awards 2021
The DASH Industry Forum (DASH-IF) is proud to announce its second dash.js award. Again, we are looking for developers who made contributions of significant benefit to the advancement of the dash.js project. 
All information can be found [here](https://github.com/Dash-Industry-Forum/dash.js/wiki/dash.js-awards-2021).

### Migration from v3.x to v4.0
If you are migrating from dash.js v3.x to dash.js v4.x please read the migration document found [here](https://github.com/Dash-Industry-Forum/dash.js/wiki/Migration-to-dash.js-4.0).


## Overview
A reference client implementation for the playback of MPEG DASH via JavaScript and [compliant browsers](http://caniuse.com/#feat=mediasource). Learn more about DASH IF Reference Client on our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki).

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch. Read our [CONTRIBUTION.md](https://github.com/Dash-Industry-Forum/dash.js/blob/development/CONTRIBUTING.md) file for a walk-through of the contribution process.

All new work should be in the development branch. Master is now reserved for tagged builds.

## Demo and reference players
All these reference builds and minified files are available under both http and https.

### Samples
Multiple [dash.js samples](https://reference.dashif.org/dash.js/latest/samples/index.html) covering a wide set of common use cases.

### Reference players
The released [pre-built reference players ](http://reference.dashif.org/dash.js/) if you want direct access without writing any Javascript.

The [nightly build of the /dev branch reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html), is pre-release but contains the latest fixes. It is a good place to start if you are debugging playback problems.


### CDN hosted files
The latest minified files have been hosted on a global CDN and are free to use in production:

- [dash.all.min.js](http://cdn.dashjs.org/latest/dash.all.min.js)
- [dash.all.debug.js](http://cdn.dashjs.org/latest/dash.all.debug.js)

In addition, all the releases are available under the following urls. Replace "vx.x.x" with the release version, for instance "v3.1.0".

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)



## Documentation
Full [API Documentation](http://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html) is available describing all public methods, interfaces, properties, and events.

For help, join our [Slack channel](https://dashif-slack.azurewebsites.net), our [email list](https://groups.google.com/d/forum/dashjs) and read our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki).

## Tutorials

Detailed information on specific topics can be found in our tutorials:

* [Low latency streaming](https://github.com/Dash-Industry-Forum/dash.js/wiki/Low-Latency-streaming)
* [UTCTiming Clock synchronization](https://github.com/Dash-Industry-Forum/dash.js/wiki/UTCTiming---Clock-synchronization)
* [Digital Rights Management (DRM) and license acquisition](https://github.com/Dash-Industry-Forum/dash.js/wiki/Digital-Rights-Management-(DRM)-and-license-acquisition)
* [Buffer and scheduling logic](https://github.com/Dash-Industry-Forum/dash.js/wiki/Buffer-and-Scheduling-Logic)

## Getting Started

The standard setup method uses javascript to initialize and provide video details to dash.js. `MediaPlayerFactory` provides an alternative declarative setup syntax.

### Standard Setup

Create a video element somewhere in your html. For our purposes, make sure the controls attribute is present.
```html
<video id="videoPlayer" controls></video>
```
Add dash.all.min.js to the end of the body.
```html
<body>
  ...
  <script src="yourPathToDash/dash.all.min.js"></script>
</body>
```
Now comes the good stuff. We need to create a MediaPlayer and initialize it.
``` js

var url = "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd";
var player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector("#videoPlayer"), url, true);

```

When it is all done, it should look similar to this:
```html
<!doctype html>
<html>
    <head>
        <title>Dash.js Rocks</title>
        <style>
            video {
                width: 640px;
                height: 360px;
            }
        </style>
    </head>
    <body>
        <div>
            <video id="videoPlayer" controls></video>
        </div>
        <script src="yourPathToDash/dash.all.min.js"></script>
        <script>
            (function(){
                var url = "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd";
                var player = dashjs.MediaPlayer().create();
                player.initialize(document.querySelector("#videoPlayer"), url, true);
            })();
        </script>
    </body>
</html>
```

### Module Setup

We publish dash.js to [npm](https://www.npmjs.com/package/dashjs). Examples of how to use dash.js in different module
bundlers can be found in the [`samples/modules`](https://github.com/Dash-Industry-Forum/dash.js/tree/development/samples/modules) directory.

### MediaPlayerFactory Setup

An alternative way to build a Dash.js player in your web page is to use the MediaPlayerFactory.  The MediaPlayerFactory will automatically instantiate and initialize the MediaPlayer module on appropriately tagged video elements.

Create a video element somewhere in your html and provide the path to your `mpd` file as src. Also ensure that your video element has the `data-dashjs-player` attribute on it.
```html
<video data-dashjs-player autoplay src="https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd" controls>
</video>

```

Add dash.all.min.js to the end of the body.
```html
<body>
  ...
  <script src="yourPathToDash/dash.all.min.js"></script>
</body>
```

When it is all done, it should look similar to this:
```html
<!doctype html>
<html>
    <head>
        <title>Dash.js Rocks</title>
        <style>
            video {
                width: 640px;
                height: 360px;
            }
        </style>
    </head>
    <body>
        <div>
            <video data-dashjs-player autoplay src="https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd" controls>
            </video>
        </div>
        <script src="yourPathToDash/dash.all.min.js"></script>
    </body>
</html>
```

## Quick Start for Developers

1. Install Core Dependencies
    * [install nodejs](http://nodejs.org/)
2. Checkout project repository (default branch: development)
    * ```git clone https://github.com/Dash-Industry-Forum/dash.js.git```
3. Install dependencies
    * ```npm install```
4. Build, watch file changes and launch samples page, which has links that point to reference player and to other examples (basic examples, captioning, ads, live, etc).
    * ```npm run start```


### Other Tasks to Build / Run Tests on Commandline.

* Build distribution files (minification included)
    * ```npm run build```
* Build and watch distribution files 
    * ```npm run dev```
* Run linter on source files (linter is also applied when building files)
    * ```npm run lint```
* Run unit tests
    * ```npm run test```
* Generate API jsdoc
    * ```npm run doc```
    
### Troubleshooting
* In case the build process is failing make sure to use an up-to-date node.js version. The build process was successfully tested with node.js version 14.16.1.

### License
dash.js is released under [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md)

### Tested With

[<img src="https://cloud.githubusercontent.com/assets/7864462/12837037/452a17c6-cb73-11e5-9f39-fc96893bc9bf.png" alt="Browser Stack Logo" width="300">](https://www.browserstack.com/)
