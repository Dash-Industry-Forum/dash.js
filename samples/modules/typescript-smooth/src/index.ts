import * as dashjs from 'dashjs';
import '../node_modules/dashjs/dist/modern/esm/dash.mss.min.js';


let url = "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest";
let player = dashjs.MediaPlayer().create();
// @ts-ignore
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
let version = player.getVersion();
document.getElementById('version-output').innerText = `Version ${version}`;
