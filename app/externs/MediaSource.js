/**
 * This file describes the new MediaSource API.
 */


/**
 * @constructor
 * @extends {EventTarget}
 */
function MediaSource(){}
/** @type {Array.<SourceBuffer>} */
MediaSource.prototype.sourceBuffers=null;
/** @type {Array.<SourceBuffer>} */
MediaSource.prototype.activeSourceBuffers=null;
/** @type {number} */
MediaSource.prototype.duration=NaN;
/** @type {string} */
MediaSource.prototype.readyState=NaN;
/**
 *
 * @param {string} error "network" or "decode"
 */
MediaSource.prototype.endOfStream=function(error){};

/**
 *
 * @param {string} type
 * @return {SourceBuffer}
 */
MediaSource.prototype.addSourceBuffer=function (type){return null;};
/**
 *
 * @param {SourceBuffer} sourceBuffer
 */
MediaSource.prototype.removeSourceBuffer=function (sourceBuffer){};


/**
 *
 * @constructor
 * @extends {MediaSource}
 */
function WebKitMediaSource(){}



/**
 * @constructor
 * @extends {EventTarget}
 */
function SourceBuffer(){}
/** @type {number} */
SourceBuffer.prototype.timestampOffest=NaN;
/** @type {TimeRanges} */
SourceBuffer.prototype.buffered=null;
/**
 * @param {Uint8Array} data
 */
SourceBuffer.prototype.append =function(data){};
SourceBuffer.prototype.abort =function(){};
/**
 *
 * @param {number} start
 * @param {number} end
 */
SourceBuffer.prototype.remove =function(start, end){};

