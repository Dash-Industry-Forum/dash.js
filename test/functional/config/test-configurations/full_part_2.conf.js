import liveBasic from '../testcases/live-basic.js'
import lowLatency from '../testcases/low-latency.js'
import mss from '../testcases/mss.js'
import multiAudio from '../testcases/multi-audio.js'

export default function getConfig() {
    return [].concat(liveBasic, lowLatency, mss, multiAudio);
}

