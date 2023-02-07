import { MediaPlayer } from 'dashjs';

let url = "https://dash.akamaized.net/envivio/Envivio-dash2/manifest.mpd";
let player = MediaPlayer().create();
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
