
<img src="https://cloud.githubusercontent.com/assets/2762250/7824984/985c3e76-03bc-11e5-807b-1402bde4fe56.png" width="400">

Build status (CircleCI): [![CircleCI](https://circleci.com/gh/Dash-Industry-Forum/dash.js/tree/development.svg?style=svg)](https://circleci.com/gh/Dash-Industry-Forum/dash.js/tree/development)

Join the discussion: [![Slack Status](https://dashif-slack.azurewebsites.net/badge.svg)](https://dashif-slack.azurewebsites.net)

## Overview
A reference client implementation for the playback of MPEG DASH via JavaScript and [compliant browsers](http://caniuse.com/#feat=mediasource). Learn more about DASH IF Reference Client on our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki).

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch. Read our [CONTRIBUTION.md](https://github.com/Dash-Industry-Forum/dash.js/blob/development/CONTRIBUTING.md) file for a walk-through of the contribution process.

All new work should be in the development branch. Master is now reserved for tagged builds.

## Documentation
Before you get started, please read the Dash.js v3.0 Migration Document found [here](https://github.com/Dash-Industry-Forum/dash.js/wiki/Migration-3.0)

Full [API Documentation](http://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html) is available describing all public methods, interfaces, properties, and events.

For help, join our [Slack channel](https://dashif-slack.azurewebsites.net), our [email list](https://groups.google.com/d/forum/dashjs) and read our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki).

## Reference players
The released [pre-built reference players](http://reference.dashif.org/dash.js/) are publicly accessible if you want direct access without writing any Javascript.

Multiple dash.js samples covering a wide set of common use cases can be found in the project's sample folder hosted [here](http://reference.dashif.org/dash.js/latest/samples/index.html).

The [nightly build of the /dev branch reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html), is pre-release but contains the latest fixes. It is a good place to start if you are debugging playback problems.

A nightly build of the latest minified files are also available: [dash.all.min.js](http://reference.dashif.org/dash.js/nightly/dist/dash.all.min.js) and its debug version  [dash.all.debug.js](http://reference.dashif.org/dash.js/nightly/dist/dash.all.debug.js).

All these reference builds and minified files are available under both http and https.

## Quick Start for Users
If you just want a DASH player to use and don't need to see the code or commit to this project, then follow the instructions below. If you are a developer and want to work with this code base, then skip down to the "Quick Start for Developers" section.

Put the following code in your web page
```
<script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
...
<style>
    video {
       width: 640px;
       height: 360px;
    }
</style>
...
<body>
   <div>
       <video data-dashjs-player autoplay src="https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd" controls></video>
   </div>
</body>
```
Then place your page under a web server (do not try to run from the file system) and load it via http in a MSE-enabled browser. The video will start automatically. Switch out the manifest URL to your own manifest once you have everything working. If you prefer to use the latest code from this project (versus the last tagged release) then see the "Quick Start for Developers" section below.

View the /samples folder for many other examples of embedding and using the player. If you are interested in captioning support, which requires some additional UI elements, then please view the [captioning examples](https://github.com/Dash-Industry-Forum/dash.js/tree/development/samples/captioning).


## Quick Start for Developers

1. Install Core Dependencies
    * [install nodejs](http://nodejs.org/)
    * [install grunt](http://gruntjs.com/getting-started)
        * ```npm install -g grunt-cli```
2. Checkout project repository (default branch: development)
    * ```git clone https://github.com/Dash-Industry-Forum/dash.js.git```
3. Install dependencies
    * ```npm install```
4. Build, watch file changes and launch samples page, which has links that point to reference player and to other examples (basic examples, captioning, ads, live, etc).
    * ```grunt dev```


### Other Grunt Tasks to Build / Run Tests on Commandline.

1. Individual tasks:
    * Quickest build
        * ```grunt debug```
    * Lint
        * ```grunt lint```
    * Run unit tests
        * ```grunt test```
    * Build distribution files (minification included)
        * ```grunt dist```
    * Build distribution files, lint, run unit tests and generate documentation
        * ```grunt release```
2. GruntFile.js default task (equivalent to ```grunt dist && grunt test```)
    * ```grunt```



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

### Tested With

[<img src="https://cloud.githubusercontent.com/assets/7864462/12837037/452a17c6-cb73-11e5-9f39-fc96893bc9bf.png" alt="Browser Stack Logo" width="300">](https://www.browserstack.com/)
