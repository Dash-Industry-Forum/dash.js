import { MediaPlayer } from 'dashjs';
import ControlBar from 'dashjs/contrib/akamai/controlbar/ControlBar';

let url = "https://dash.akamaized.net/envivio/Envivio-dash2/manifest.mpd";
let player = MediaPlayer().create();
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);

const controlBar = new ControlBar(player)

controlBar.initialize()
