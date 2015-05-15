/// We make a global namespace for backward-compatability purposes
// Browserify (more accurately UMD) does not allow for multiple exported modules
// at once so this a quick and ugly hack for now

import Dash from './dash/Dash.js';
import MediaPlayer from './streaming/MediaPlayer.js';

global.Dash = Dash;
global.MediaPlayer = MediaPlayer;

export { Dash };
export { MediaPlayer };
