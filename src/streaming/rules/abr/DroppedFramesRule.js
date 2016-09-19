
import FactoryMaker from '../../../core/FactoryMaker.js';
import DroppedFramesHistory from '../DroppedFramesHistory.js';
import VideoModel from '../../models/VideoModel.js';
import Debug from '../../../core/Debug';

function DroppedFramesRule() {
    const log = Debug(this.context).getInstance().log;

    const DROPPED_PERCENTAGE_FORBID = 0.15;
    const GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).

    let videoModel = VideoModel(this.context).getInstance();
    let droppedFramesHistory = DroppedFramesHistory(this.context).create();

    function execute(rulesContext, playbackIndex) {
        if (playbackIndex) {
            if (videoModel.getElement()) {
                let playbackQuality = videoModel.getPlaybackQuality();
                droppedFramesHistory.push(playbackIndex, playbackQuality);

                let dfh = droppedFramesHistory.getFrameHistory();
                let droppedFrames = 0;
                let totalFrames = 0;
                let maxIndex = -1;
                for (let i = 1; i < dfh.length; i++) { //No point in measuring dropped frames for the zeroeth index.
                    if (dfh[i]) {
                        droppedFrames = dfh[i].droppedVideoFrames;
                        totalFrames = dfh[i].totalVideoFrames;

                        if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                            maxIndex = i - 1;
                            break;
                        }
                    }
                }
                log('DroppedFramesRule, index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                return maxIndex;
            }
        }

        return -1;
    }

    function reset() {
        let playbackQuality = videoModel.getPlaybackQuality();
        droppedFramesHistory.reset(playbackQuality);
    }

    return {
        execute: execute,
        reset: reset
    };
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
let factory = FactoryMaker.getClassFactory(DroppedFramesRule);

export default factory;