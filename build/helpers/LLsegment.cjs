const fs = require("fs");
const path = require("path");

const segmentData = fs.readFileSync(path.join(__dirname, 'data', 'chunk', 'chunk-stream_0-00001.m4s'));
const segmentInfo = fs.readFileSync(path.join(__dirname, 'data', 'chunk', 'chunk-stream_0-00001.json')).toString();

function sendChunks(res, segmentInfoData, param, interval, previousTs, chunkDistances) {
    let chunksInBurst = 0;
    if (param.chunksAvailableAtReqTime) {
        chunksInBurst = param.chunksAvailableAtReqTime;
        param.chunksAvailableAtReqTime = 0;
    } else {
        chunksInBurst = param.chunkCount;
    }

    for (let index = 0; index < chunksInBurst; index++) {
        let mdatFound = false;
        let chunkSize = 0;
        while (!mdatFound && segmentInfoData.length) {
            let box = segmentInfoData.shift();
            mdatFound = box.name === 'mdat';
            chunkSize += box.size;
        }
        if (chunkSize) {
            res.write(segmentData.slice(param.pos, param.pos + chunkSize));
            param.pos = param.pos + chunkSize;
        }
    }
    if (!segmentInfoData.length) {
        if (chunkDistances && chunkDistances.length) {
            // console.log('all sent with average chunk (burst) distance', chunkDistances.reduce((prev, curr) => prev + curr, 0) / chunkDistances.length)
        }
        return res.end();
    }

    let processingDuration = 0;
    const chunkDistance = Date.now() - previousTs;
    // console.log('ms since last call', chunkDistance)

    if (chunkDistance > interval) {
        chunkDistances.push(chunkDistance)
        processingDuration = chunkDistance - interval;
    }
    if (interval - processingDuration > 0) {
        setTimeout((previousTs) => {
            sendChunks(res, segmentInfoData, param, interval, previousTs, chunkDistances);
        }, interval - processingDuration, Date.now()); // minus processing duration on producer side
    }
}

function streamWithPattern(res, interval, chunkCount, chunksAvailableAtReqTime) {
    const segmentInfoData = JSON.parse(segmentInfo);

    res.statusCode = 200;

    const param = {
        chunkCount,
        pos: 0,
        chunksAvailableAtReqTime
    }

    sendChunks(res, segmentInfoData, param, interval, Date.now(), []);
}


module.exports = function (req, res) {
    switch (req.url) {
        case '/ll/pattern0':
            streamWithPattern(res, 0, 0, 60);
            break;
        case '/ll/pattern1':
            streamWithPattern(res, 33, 1, 0);
            break;
        case '/ll/pattern2':
            streamWithPattern(res, 133, 4, 0);
            break;
        case '/ll/pattern3':
            streamWithPattern(res, 333, 10, 0);
            break;
        case '/ll/pattern4':
            streamWithPattern(res, 1000, 30, 0);
            break;
        case '/ll/pattern5':
            streamWithPattern(res, 33, 1, 30);
            break;
        case '/ll/pattern6':
            streamWithPattern(res, 133, 4, 30);
            break;
        case '/ll/pattern7':
            streamWithPattern(res, 333, 10, 30);
            break;
        case '/ll/pattern8':
            streamWithPattern(res, 1000, 30, 30);
            break;
        default:
            console.log('unknown', req.url);
            res.statusCode = 404;
            return res.end();
    }
};