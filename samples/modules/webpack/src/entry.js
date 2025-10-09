import * as dashjs from 'dashjs';

let url = "https://dash.akamaized.net/envivio/Envivio-dash2/manifest.mpd";
let player = dashjs.MediaPlayer().create();
player.updateSettings({
    debug: {
        logLevel: 5
    }
})
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
document.querySelector('#version').innerHTML = 'Version ' + player.getVersion();
