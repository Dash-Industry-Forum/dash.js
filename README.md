
<img src="https://cloud.githubusercontent.com/assets/2762250/7824984/985c3e76-03bc-11e5-807b-1402bde4fe56.png" width="400">

Travis CI Status: [![Travis CI Status](http://img.shields.io/travis/Dash-Industry-Forum/dash.js/development.svg?style=flat-square)](https://travis-ci.org/Dash-Industry-Forum/dash.js)

A reference client implementation for the playback of MPEG DASH via JavaScript and compliant browsers. Learn more about DASH IF Reference Client on our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki).

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch. Read through our wiki section on https://github.com/Dash-Industry-Forum/dash.js/wiki/How-to-Contribute for a walk-through of the contribution process.

All new work should be in the development branch. Master is now reserved for tagged builds.

View the /samples folder for many other examples of embedding and using the player. For help, join our [email list](https://groups.google.com/d/forum/dashjs) and read our [wiki](https://github.com/Dash-Industry-Forum/dash.js/wiki) .


## Quick Start for Developers with 2.0 refactor

### Reference Player
1. Download 'development' branch
2. Extract dash.js and move the entire folder to localhost (or run any http server instance such as python's SimpleHTTPServer at the root of the dash.js folder).
3. Open samples/dash-if-reference-player/index.html in your MSE capable web browser.

### Install Core Dependencies
1. [install nodejs](http://nodejs.org/)
2. [install grunt](http://gruntjs.com/getting-started)
    * npm install -g grunt-cli

### Build / Run tests on commandline.
1. Install all Node Modules defined in package.json
    * npm install
2. Run the GruntFile.js default task
    * grunt
3. You can also target individual tasks: E.g.
	* grunt debug (quickest build)
    * grunt dist
    * grunt release
    * grunt test
    

## Getting Started

The standard setup method uses javascript to initialize and provide video details to dash.js. `MediaPlayerFactory` provides an alternative declarative setup syntax.

### Standard Setup

Create a video element somewhere in your html. For our purposes, make sure to set the controls property to true.
```html
<video id="videoPlayer" controls="true"></video>
```
Add dash.all.min.js to the end of the body.
```html
<body>
  ...
  <script src="yourPathToDash/dash.all.min.js"></script>
</body>
```
Now comes the good stuff. We need to create a MediaPlayer and initialize it.  We will do this in an anonymous self executing function, that way it will run as soon as the page loads. So, here is how we do it:
``` js
(function(){
    var url = "http://dash.edgesuite.net/envivio/Envivio-dash2/manifest.mpd";
    var player = dashjs.MediaPlayer().create();
    player.initialize(document.querySelector("#videoPlayer"), url, true);
})();
```

When it is all done, it should look similar to this:
```html
<!doctype html>
<html>
    <head>
        <title>Dash.js Rocks</title>
    </head>
    <body>
        <div>
            <video id="videoPlayer" controls="true"></video>
        </div>
        <script src="yourPathToDash/dash.all.min.js"></script>
        <script>
            (function(){
                var url = "http://dash.edgesuite.net/envivio/Envivio-dash2/manifest.mpd";
                var player = dashjs.MediaPlayer().create();
                player.initialize(document.querySelector("#videoPlayer"), url, true);
            })();
        </script>
    </body>
</html>
```

### MediaPlayerFactory Setup

Create a video element somewhere in your html and provide the path to your `mpd` file as src. Also ensure that your video element has the `data-dashjs-player` attribute on to it.
```html
<video data-dashjs-player autoplay src="http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd" controls="true">
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
    </head>
    <body>
        <div>
            <video data-dashjs-player autoplay src="http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd" controls="true">
            </video>
        </div>
        <script src="yourPathToDash/dash.all.min.js"></script>
    </body>
</html>
```

## Tested With

[<img src="https://cloud.githubusercontent.com/assets/7864462/12837037/452a17c6-cb73-11e5-9f39-fc96893bc9bf.png" alt="Browser Stack Logo" width="400">](https://www.browserstack.com/)
