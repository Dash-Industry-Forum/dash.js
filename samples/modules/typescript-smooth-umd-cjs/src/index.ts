require('../node_modules/dashjs/dist/legacy/umd/dash.all.min.js');
require('../node_modules/dashjs/dist/legacy/umd/dash.mss.min.js');


if (dashjs && dashjs.MediaPlayer) {
    let url = "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest";
    let player = dashjs.MediaPlayer().create();
    // @ts-ignore
    player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
    let version = player.getVersion();
    document.getElementById('version-output').innerText = `Version ${version}`;
} else {
    console.error('dashjs.MediaPlayer is undefined');
}
