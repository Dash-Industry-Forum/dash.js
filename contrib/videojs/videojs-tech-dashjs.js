/**
 * videojs-tech-dash
 *
 * Use Dash.js to playback DASH content inside of Video.js
 * 
 * @param {vjs.Player|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
videojs.Dashjs = videojs.Html5.extend({
  init: function(player, options, ready){
    var source, context, mediaPlayer;

    source = options.source;
    // need to remove the source so the HTML5 controller
    // doesn't try to use it
    delete options.source;

    // Accept externally created context and media player references
    // or default to baseline
    context = player.options().context || new Dash.di.DashContext();
    mediaPlayer = player.options().mediaPlayer || new MediaPlayer(context);

    // run the init of the HTML5 controller
    videojs.Html5.call(this, player, options, ready);

    // Must run controller before these two lines or else there is no
    // element to bind to.
    mediaPlayer.startup();
    mediaPlayer.attachView(this.el());

    // Dash.js autoplays by default
    if (!options.autoplay) {
      mediaPlayer.setAutoPlay(false);
    }

    // Attach the source
    mediaPlayer.attachSource(source.src);

    // Per DAN - people will need access to the context and mediaPlayer
    player.mediaPlayer = mediaPlayer;
    player.context = context;
  }
});

videojs.Dashjs.prototype.currentTime = function() {
  if(this.player().mediaPlayer) {
    try {
      return this.player().mediaPlayer.time();
    } catch (err) {
      // console.log('err', err.stack);
    }
  }
  return videojs.Html5.prototype.currentTime.call(this);
};

videojs.Dashjs.prototype.setCurrentTime = function(time) {
  if(this.player().mediaPlayer) {
    this.player().mediaPlayer.seek(time);
  } else {
    videojs.Html5.prototype.setCurrentTime.call(this, time);
  }
};

videojs.Dashjs.prototype.duration = function() {
  if(this.player().mediaPlayer) {
    try {
      return this.player().mediaPlayer.duration();
    } catch (err) {
      // console.log('err', err.stack);
    }
  }
  return videojs.Html5.prototype.duration.call(this);
};

videojs.Dashjs.isSupported = function(){
  return !!window.MediaSource;
};

videojs.Dashjs.canPlaySource = function(srcObj){
  if (srcObj.type === 'application/dash+xml') {
    // TODO: allow codec info and check browser support
    return 'maybe';
  } else {
    return '';
  }
};

// add this to the top of the list of available media playback technologies
videojs.options.techOrder.unshift('dashjs');