/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
 */
MediaPlayer = function (aContext) {
    "use strict";

/*
 * Initialization:
 * 
 * 1) Check if MediaSource is available.
 * 2) Load manifest.
 * 3) Parse manifest.
 * 4) Check if Video Element can play codecs.
 * 5) Register MediaSource with Video Element.
 * 6) Create SourceBuffers.
 * 7) Do live stuff.
 *      a. Start manifest refresh.
 *      b. Calculate live point.
 *      c. Calculate offset between availabilityStartTime and initial video timestamp.
 * 8) Start buffer managers.
 * 
 * Buffer Management:
 * 
 * 1) Generate metrics.
 * 2) Check if fragments should be loaded.
 * 3) Check ABR for change in quality.
 * 4) Figure out which fragments to load.
 * 5) Load fragments.
 * 6) Transform fragments.
 * 7) Push fragmemt bytes into SourceBuffer.
 */
    
    var context = aContext,
        system,
        element,
        source,
        model,
        stream,
        initialized = false,
        playing = false,
        autoPlay = true,
        
        isReady = function () {
            return (element !== undefined && source !== undefined);
        },
        
        play = function () {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            
            if (!this.capabilities.supportsMediaSource()) {
                throw "Media Source not supported.";
            }
            
            if (!element || !source) {
                throw "Missing view or source.";
            }
            
            playing = true;
            this.debug.log("Playback initiated!");
            stream = system.getObject("stream");
            stream.load(source);
        },
        
        doAutoPlay = function () {
            if (autoPlay && isReady()) {
                play.call(this);
            }
        };

    // Set up DI.
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);
    
    return {
        debug: undefined,
        capabilities: undefined,
        videoModel: undefined,
        
        startup: function () {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
            }
        },
        
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        
        getAutoPlay: function() {
            return autoPlay;
        },
        
        attachView: function (view) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            
            element = view;
            model = new MediaPlayer.models.VideoModel(element);
            this.videoModel.setElement(element);
            
            // TODO : update
            
            if (!playing) {
                doAutoPlay.call(this);
            }
        },
        
        attachSource: function (url) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            
            source = url;
            
            // TODO : update
            
            if (!playing) {
                doAutoPlay.call(this);
            }
        },
        
        play: play
    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};
MediaPlayer.utils = {};
MediaPlayer.models = {};
MediaPlayer.vo = {};
MediaPlayer.vo.metrics = {};
MediaPlayer.rules = {};
MediaPlayer.di = {};
