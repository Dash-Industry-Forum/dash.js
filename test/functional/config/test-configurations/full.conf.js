import drm from '../testcases/drm.js'
import emsg from '../testcases/emsg.js'
import eptDelta from '../config/testcases/ept-delta.js'
import gaps from '../config/testcases/gaps.js'
import liveBasic from '../config/testcases/live-basic.js'
import lowLatency from '../config/testcases/low-latency.js'
import mss from '../config/testcases/mss.js'
import multiAudio from '../config/testcases/multi-audio.js'
import multiperiod from '../config/testcases/multiperiod.js'
import subtitle from '../config/testcases/subtitle.js'
import vendor from '../config/testcases/vendor.js'
import vodBasic from '../config/testcases/vod-basic.js'

export default function getConfig() {
    return [].concat(drm, emsg, eptDelta, gaps, liveBasic, lowLatency, mss, multiAudio, multiperiod, subtitle, vendor, vodBasic);
}

