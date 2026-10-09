// Static import: resolves the "import" condition of the dashjs exports map (ESM bundle).
import dashjs from 'dashjs';

console.log(dashjs.Version);

// Dynamic import: mirrors how wrappers such as dash-video-element consume dashjs.
const dynamicallyImported = await import('dashjs');
console.log(dynamicallyImported.default.MediaPlayer !== undefined);
