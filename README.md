# dash.js

A reference client implementation for the playback of MPEG DASH via JavaScript and compliant browsers. Learn more about DASH IF Reference Client.

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch. Read through our wiki section on https://github.com/Dash-Industry-Forum/dash.js/wiki/How-to-Contribute for a walk-through of the contribution process.

All new work should be in the development branch.  Master is now reserved to tag builds.

## Quick Start

Download 'master' or latest tagged release, extract and open main folder dash.js/index.html in your web browser to view the main test file.

### Install Dependencies
1. [install nodejs](http://nodejs.org/)
2. [install grunt](http://gruntjs.com/getting-started)
    * npm install -g grunt-cli
3. [install grunt-template-jasmine-istanbul](https://github.com/maenu/grunt-template-jasmine-istanbul)
    * npm install grunt-template-jasmine-istanbul --save-dev
4. install some other dependencies:
    * npm install grunt-contrib-connect grunt-contrib-watch grunt-contrib-jshint grunt-contrib-uglify

### Build / Run tests:
```
grunt --config Gruntfile.js --force
```

## Getting Started
Create a video element somewhere in your html. For our purposes, make sure to set the controls property to true.
```
<video id="videoPlayer" controls="true"></video>
```
Add dash.all.js to the end of the body.
```
<body>
  ...
  <script src="yourPathToDash/dash.all.js"></script>
</body>
```
Now comes the good stuff. We need to create a dash context. Then from that context we create a media player, initialize it, attach it to our "videoPlayer" and then tell it where to get the video from. We do this like so:
``` js
function setupPlayer(){
    var url = "http://dash.edgesuite.net/dash264/TestCases/1c/qualcomm/2/MultiRate.mpd";
    var context = new Dash.di.DashContext();
    var player = new MediaPlayer(context);
    player.startup();
    player.attachView(docment.querySelector("videoPlayer"));
    player.attachSource(url);
}
```
All that's left to do is to make sure that we setup the player when we load the page, which we can do by modifying the body tag.
```
<body onload="setupPlayer()">
```

When it is all done, it should look similar to this:
```
<!doctype html>
<html>
    <head>
        <title>Dash.js Rocks</title>
    </head>
    <body onload="setupPlayer()">
        <div>
            <video id="videoPlayer" controls="true"></video>
        </div>
        <script src="yourPathToDash/dash.all.js"></script>
        <script>
            function setupPlayer(){
                var url = "http://dash.edgesuite.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1.mpd";
                var context = new Dash.di.DashContext();
                var player = new MediaPlayer(context);
                player.startup();
                player.attachView(document.querySelector("#videoPlayer"));
                player.attachSource(url);
            }
        </script>
    </body>
</html>
```
