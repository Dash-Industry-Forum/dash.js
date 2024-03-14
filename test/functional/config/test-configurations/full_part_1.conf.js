import drm from '../testcases/drm.js'
import emsg from '../testcases/emsg.js'
import eptDelta from '../testcases/ept-delta.js'
import gaps from '../testcases/gaps.js'

export default function getConfig() {
    return [].concat(drm, emsg, eptDelta, gaps);
}

