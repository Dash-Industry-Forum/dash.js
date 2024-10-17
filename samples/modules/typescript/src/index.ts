import * as dashjs from 'dashjs';

let url = "https://dash.akamaized.net/envivio/Envivio-dash2/manifest.mpd";
let player = dashjs.MediaPlayer().create();
// @ts-ignore
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
let version = player.getVersion();
document.getElementById('version-output').innerText = `Version ${version}`;
