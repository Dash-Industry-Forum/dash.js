import multiperiod from '../testcases/multiperiod.js'
import subtitle from '../testcases/subtitle.js'
import vendor from '../testcases/vendor.js'
import vodBasic from '../testcases/vod-basic.js'

export default function getConfig() {
    return [].concat(multiperiod, subtitle, vendor, vodBasic);
}

