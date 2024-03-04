import drm from '../testcases/drm.js'
import emsg from '../testcases/emsg.js'
import eptDelta from '../testcases/ept-delta.js'
import gaps from '../testcases/gaps.js'
import liveBasic from '../testcases/live-basic.js'
import lowLatency from '../testcases/low-latency.js'
import mss from '../testcases/mss.js'
import multiAudio from '../testcases/multi-audio.js'
import multiperiod from '../testcases/multiperiod.js'
import subtitle from '../testcases/subtitle.js'
import vendor from '../testcases/vendor.js'
import vodBasic from '../testcases/vod-basic.js'

export default function getConfig() {
    return [].concat(drm, emsg, eptDelta, gaps, liveBasic, lowLatency, mss, multiAudio, multiperiod, subtitle, vendor, vodBasic);
}

