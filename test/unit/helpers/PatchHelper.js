import DashConstants from '../../../src/dash/constants/DashConstants.js';

function staticSElements() {
    return [[0, 10], [10, 5], [15, 10]].map(([t, d]) => {
        return {
            __children: [],
            d: d,
            t: t
        };
    });
}

function staticSegmentTimeline() {
    let sElements = staticSElements();
    return {
        S: sElements,
        __children: sElements.map((element) => {
            return {
                S: element
            };
        })
    };
}

function staticSegmentTemplate() {
    let timeline = staticSegmentTimeline();
    return {
        SegmentTimeline: timeline,
        __children: [{
            SegmentTimeline: timeline
        }]
    };
}

function staticAdaptationSet(id) {
    let template = staticSegmentTemplate();
    return {
        SegmentTemplate: template,
        __children: [{
            SegmentTemplate: template
        }],
        id: id
    };
}

function staticBaseUrl(url, serviceLocation) {
    if (!serviceLocation) {
        return url;
    }
    return {
        __children: [
            {
                '#text': url
            }
        ],
        serviceLocation: serviceLocation,
        __text: url
    }
}

function staticPeriod(id) {
    let baseUrl = staticBaseUrl(`period-${id}/`);
    let adaptationSets = [staticAdaptationSet(10), staticAdaptationSet(20)];
    return {
        BaseURL: [baseUrl],
        AdaptationSet: adaptationSets,
        __children: [
            { BaseURL: baseUrl },
            { AdaptationSet: adaptationSets[0] },
            { AdaptationSet: adaptationSets[1] }
        ],
        id: id
    }
}

class PatchHelper {

    generatePatch(mpdId, operations = []) {
        return {
            [DashConstants.ORIGINAL_MPD_ID]: mpdId,
            [DashConstants.PUBLISH_TIME]: new Date().toISOString(),
            [DashConstants.ORIGINAL_PUBLISH_TIME]: new Date().toISOString(),
            // only the ordered child array is simulated
            __children: operations.map((operation) => {
                if (operation.action === 'add') {
                    // add is special because it has extra possible attributes
                    return {
                        tagName: operation.action,
                        sel: operation.selector,
                        __children: operation.children,
                        __text: operation.text,
                        pos: operation.position,
                        type: operation.type
                    }

                } else {
                    return {
                        tagName: operation.action,
                        sel: operation.selector,
                        __children: operation.children,
                        __text: operation.text
                    };
                }
            })
        };
    }

    getStaticBaseMPD() {
        // we will generate a simple base manifest example, it will not be a fully valid manifest
        // but it will match the object structure of X2JS
        let baseUrl = staticBaseUrl('http://example.com/base', 'a');
        let utcTiming = 'timetime';
        let period = staticPeriod('foo');
        return {
            UTCTiming: [utcTiming],
            BaseURL: [baseUrl],
            Period: [period],
            __children: [
                { UTCTiming: utcTiming },
                { BaseURL: baseUrl },
                { Period: period }
            ],
            id: 'foobar'
        }
    }
}

export default PatchHelper;
