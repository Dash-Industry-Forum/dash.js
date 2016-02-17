# Dash.js Migration Document 1.x --> 2.0
In this document we will cover the major changes to consider when migrating your player from Dash.js version 1.x to 2.0.  Here are some high level points:
* We have refactored the entire code base from ECMAScript 5 to ECMAScript 6. 
* We have changed the namespace.
* We have changed how you create MediaPlayer. 
* We have added events and public API to the MediaPlayer module 
* We have deprecated some of the API calls.
* We have externalized some functionality into optional "plugins"
* We have changed how you extend Dash.js
* We have added experimental BOLA ABR.
* We have changed the build and distribution process. 

## The Refactor Project
The project was started over three years ago when the MSE/EME API was new.  It has come a long way due to the hard work of many contributors.  It grew to a point where it was becoming hard to understand and maintain.  So we decided to refactor! First, we wanted to convert the entire codebase to ES6 Modules/Classes and remove the DI framework and multiple event systems.  This way, optimizing and simplifying the code would be easier.  Then we wanted to rework much of the logic. We did manage to rework and simplify some stuff but we did not manage to get to all of what is needed. There is still a lot of code snarl and we plan on refactoring this over time.  There is still a lot of ES5 code that needs to be converted.  Please feel free to file an issue on github highlighting areas in need of refactoring or optimizing! Even better, submit a PR!

```We are currently and always looking for contributors! ```

## New Dash.js Modules
*In v2.0 all modules can be accessed under the namespace **dashjs***
``` js
* dashjs.MediaPlayer
* dashjs.MediaPlayerFactory
* dashjs.Protection (Optional Auto Detected Plugin)
* dashjs.MetricsReporting (Optional Auto Detected Plugin)
```
## MediaPlayer Creation
*Example of how you create a MediaPlayer in v2.0.*
```
var url = "http://dash.edgesuite.net/envivio/Envivio-dash2/manifest.mpd";
var element = document.querySelector("#selector")
var player = dashjs.MediaPlayer().create();
player.initialize(element, url, true);
```
##### MediaPlayerFactory
We have also moved the code from Dash.create() and createAll() to MediaPlayerFactory.  This is an alternative way to build a Dash.js player in your web page.  The MediaPlayerFactory will automatically instantiate and initialize the MediaPlayer module on appropriately tagged video elements. 

## New Public API
We have cloned most of the native video element's API and events in MediaPlayer. In your player we suggest that you use the available playback API and events from MediaPlayer instead of the native video element. The video element controls are limited and can not handle such features as live streams with DVR windows or Multiple Period content.  In Dash.js 1.x we had only partially implemented the video element's playback API in MediaPlayer. Now in  v2.0, we now have added most the calls and events.  We can add more as requested or needed.

**Note** If something is not available it means it has not been extended. In this case, feel free to use the native element's API. Please check the API Documentation for a complete set of API calls and events [here](http://cdn.dashjs.org/latest/jsdoc/index.html).

* extend
* pause
* play
* isPaused
* isSeeking
* setMute
* isMuted
* setVolume
* getVolume
* getBufferLength
* setMaxAllowedRepresentationRatioFor
* getMaxAllowedRepresentationRatioFor			    
* getLimitBitrateByPortal
* setLimitBitrateByPortal
* setInitialRepresentationRatioFor
* getInitialRepresentationRatioFor
* getAutoSwitchQualityFor
* setAutoSwitchQualityFor
* enableBufferOccupancyABR
* setBandwidthSafetyFactor
* getBandwidthSafetyFactor
* setAbandonLoadTimeout
* setBufferToKeep
* setBufferPruningInterval
* setStableBufferTime
* setBufferTimeAtTopQuality
* setFragmentLoaderRetryAttempts
* setFragmentLoaderRetryInterval
* setBufferTimeAtTopQualityLongForm
* setLongFormContentDurationThreshold
* setRichBufferThreshold


## New Events and EventBus
All public event types are now stored in MediaPlayerEvents.js and attached to dashjs.MediaPlayer.events for access. See the Plugin section below for more info on Plugin events and how they are arrogated into MediaPlayer.events for access in your player.

Please see ``` MediaPlayerEvents & ProtectionEvents```

## Deprecated, Replaced, or Changed!
**Deprecated**
``` js
getAutoSwitchQuality use getAutoSwitchQualityFor
setAutoSwitchQuality use setAutoSwitchQualityFor
``` 
**Replaced**
``` js
startup replaced by initialize 
getMetricsExt replaced by getDashMetrics
addEventListener replaced by on
removeEventListener replaced by off
Dash.create() replaced by MediaPlayerFactory.create() 
Dash.createAll() replaced by MediaPlayerFactory.createAll() 
```
**Changed**
``` js
setProtectionData - In v1.x setting protection data was an argument of attachSource.
```
## Plugin Modules
*We are trying to address the overall size of dash.all.min.js. This is a "work in-progress". We expect to pull out more features in the future.  At this point we offer two external modules both with min an debug files as well as source maps:*

In v2.0 you can now load just the MediaPlayer ```dash.mediaplayer.min.js``` and add additional modules if desired. There is no need to tell dash.js about the plugin! Just include any or all of the following scripts and Dash.js will auto detect and instantiate each plugin.  

Events for plugins will be in the plugin package. Any event in the class marked with ```public_``` will be arrogated into the MediaPlayerEvents object at load and will be accessible via MediaPlayer.events

**Protection** ```@dashjs.Protection```
``` js
dash.protection.min.js (dash.protection.debug.js)
```

**MetricsReporting** ```@dashjs.MetricsReporting```
``` js
dash.reporting.min.js (dash.reporting.debug.js)
```
## Extending Dash.js

In v1.x of Dash.js you could replace internal objects with a custom context.  We have maintained that capability but have also added a new way to extend Dash.js. We plan on adding more capabilities to extending in the future.  

There is a new method in MediaPlayer named ```extend()``` There are two ways to extend dash.js, determined by the override argument of this method:
 
 1. If you set override to true any public method in your custom object will
 override the "same named" dash.js parent object method.

 2. If you set override to false your object will completely replace the dash.js object.
 (Note: This is how it was in 1.x of Dash.js with Dijon).
 
 **When you extend you get access to this.context, this.factory and this.parent in your object. This will gain you access to dash.js internal singletons and parent object**
 * ```this.context``` - Used to pass context for singleton access.
 * ```this.factory``` - Used to call factory.getSingletonInstance() 
 * ```this.parent``` -  A reference to the parent object. *(this.parent is excluded if you extend with override set to false)*.

**You must not instantiate or call the object beforehand. Dash.js will create the object.**
``` js
player.extend("RequestModifier", SuperRequestModifier, false | true);
```

In 2.1 we plan to add more functionality [Github Issue #1162](https://github.com/Dash-Industry-Forum/dash.js/issues/1162)

## BOLA 

We introduced an experimental implementation of [BOLA](http://arxiv.org/abs/1601.06748), a new ABR algorithm. Rather than predicting throughput, BOLA does ABR based on buffer occupancy. It is still under development and is not switched on by default. [See WIKI](https://github.com/Dash-Industry-Forum/dash.js/wiki/BOLA-status)

*You can enable BOLA by calling ```enableBufferOccupancyABR(true | false)``` in MediaPlayer before playback begins.*

## Build and Distribution
##### Grunt, Babel, Browserify....
As mentioned above, we now transpile and prepare the code for present day browsers. This means we have a compile step.  Thus, there are a few more grunt tasks in v2.0's GruntFile.js.  The main task names to keep in mind are:
* ```grunt debug``` (quickest build)
* ```grunt dist``` (builds all)
* ```grunt``` (should be run before a commit)

*See the GruntFile.js for all the available tasks.*

##### Distributed File Names
* We deploy all the dist files to cdn.dashjs.org/<VERSION>/<FILE>.js. 
* ```http://``` and ```https://``` are both available.  
* We generate source maps for all the files below.  
###### Minified
* dash.all.min.js
* dash.mediaplayer.min.js
* dash.protection.min.js
* dash.reporting.min.js
###### Debug
* dash.all.debug.js
* dash.mediaplayer.debug.js
* dash.protection.debug.js
 * dash.reporting.debug.js


``` Authored by Dan Sparacio - February 12th 2016```
