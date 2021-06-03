const fs = require("fs");
const path = require("path");

const segmentData = fs.readFileSync(path.join(__dirname, 'data', 'chunk', 'chunk-stream_0-00001.m4s'));
const segmentInfo = fs.readFileSync(path.join(__dirname, 'data', 'chunk', 'chunk-stream_0-00001.json')).toString();

function sendChunks(res, segmentInfoData, param, interval, previousTs, chunkDistances) {

    for (let index = 0; index < param.chunkCount; index++) {
        let mdatFound = false;
        let chunkSize = 0;
        while (!mdatFound) {
            let box = segmentInfoData.shift();
            mdatFound = box.name === 'mdat';
            chunkSize += box.size;
        }
        res.write(segmentData.slice(param.pos, param.pos + chunkSize));
        param.pos = param.pos + chunkSize;
    }
    if (!segmentInfoData.length) {
        if (chunkDistances && chunkDistances.length) {
            console.log('all sent with average chunk (burst) distance', chunkDistances.reduce((prev, curr) => prev + curr, 0) / chunkDistances.length)
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
    setTimeout((previousTs) => {
        sendChunks(res, segmentInfoData, param, interval, previousTs, chunkDistances);
    }, interval - processingDuration, Date.now()); // minus processing duration on producer side
}

function streamWithPattern(res, interval, chunkCount) {
    const segmentInfoData = JSON.parse(segmentInfo);

    res.statusCode = 200;

    const param = {
        chunkCount,
        pos: 0
    }

    sendChunks(res, segmentInfoData, param, interval, Date.now(), []);
}


module.exports = function (req, res) {
    switch (req.url) {
        case '/ll/pattern1':
            streamWithPattern(res, 33, 1);
            break;
        case '/ll/pattern2':
            streamWithPattern(res, 133, 4);
            break;
        case '/ll/pattern3':
            streamWithPattern(res, 333, 10);
            break;
        case '/ll/pattern4':
            streamWithPattern(res, 1000, 30);
            break;
        default:
            console.log('unknown', req.url);
            res.statusCode = 404;
            return res.end();
    }
};