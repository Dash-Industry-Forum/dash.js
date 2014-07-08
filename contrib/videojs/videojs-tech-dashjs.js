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
    var source, dashContext, dashPlayer;

    source = options.source;
    // need to remove the source so the HTML5 controller
    // doesn't try to use it
    delete options.source;

    // run the init of the HTML5 controller
    videojs.Html5.call(this, player, options, ready);

    dashContext = new Dash.di.DashContext();
    dashPlayer = new MediaPlayer(dashContext);

    dashPlayer.startup();
    dashPlayer.attachView(this.el());

    // dash.js autoplays by default
    if (!options.autoplay) {
      dashPlayer.setAutoPlay(false);
    }

    dashPlayer.attachSource(source.src);
  }
});

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