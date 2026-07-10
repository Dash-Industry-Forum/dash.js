import C2paScanner from '../../../../src/streaming/c2pa/C2paScanner.js';
import C2paValidationCoordinator from '../../../../src/streaming/c2pa/C2paValidationCoordinator.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import {expect} from 'chai';

const context = {};

function createCustomParametersModelMock() {
    const interceptors = [];
    return {
        interceptors,
        addResponseInterceptor(interceptor) {
            interceptors.push(interceptor);
        },
        removeResponseInterceptor(interceptor) {
            const index = interceptors.indexOf(interceptor);
            if (index !== -1) {
                interceptors.splice(index, 1);
            }
        }
    };
}

function createResponse({type, mediaType, url, data}) {
    return {
        request: {
            url,
            customData: {
                request: {type, mediaType, url}
            }
        },
        data
    };
}

function bufferFrom(values) {
    return new Uint8Array(values).buffer;
}

describe('C2paScanner', function () {

    let customParametersModel;
    let handledSegments;
    let scanner;

    beforeEach(() => {
        customParametersModel = createCustomParametersModelMock();
        handledSegments = [];
        scanner = C2paScanner(context).create({
            customParametersModel,
            segmentHandler: (segmentInput) => {
                handledSegments.push(segmentInput);
            }
        });
    });

    describe('interceptor registration', function () {
        it('should register through the public API exactly once', () => {
            scanner.registerInterceptor();
            scanner.registerInterceptor();

            expect(customParametersModel.interceptors.length).to.equal(1);
            expect(scanner.isRegistered()).to.equal(true);
        });

        it('should deregister the interceptor', () => {
            scanner.registerInterceptor();
            scanner.deregisterInterceptor();

            expect(customParametersModel.interceptors.length).to.equal(0);
            expect(scanner.isRegistered()).to.equal(false);
        });

        it('should remove the interceptor on reset', () => {
            scanner.registerInterceptor();
            scanner.reset();

            expect(customParametersModel.interceptors.length).to.equal(0);
            expect(scanner.isRegistered()).to.equal(false);
        });
    });

    describe('response interception', function () {

        function intercept(response) {
            scanner.registerInterceptor();
            return customParametersModel.interceptors[0](response);
        }

        it('should return the same response with byte-identical data', async () => {
            const values = [0, 1, 2, 3, 250, 255];
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00289.m4s',
                data: bufferFrom(values)
            });

            const returned = await intercept(response);

            expect(returned).to.equal(response);
            expect(returned.data).to.equal(response.data);
            expect(Array.from(new Uint8Array(returned.data))).to.deep.equal(values);
        });

        it('should normalize a media chunk into a SegmentInput', async () => {
            const values = [10, 20, 30];
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00289.m4s',
                data: bufferFrom(values)
            });

            await intercept(response);

            expect(handledSegments.length).to.equal(1);
            const segmentInput = handledSegments[0];
            expect(segmentInput.kind).to.equal('media');
            expect(segmentInput.mediaType).to.equal('video');
            expect(segmentInput.trackKey).to.equal('stream3');
            expect(segmentInput.segmentNumber).to.equal(289);
            expect(segmentInput.bytes).to.be.instanceOf(Uint8Array);
            expect(Array.from(segmentInput.bytes)).to.deep.equal(values);
        });

        it('should normalize an init chunk into a SegmentInput without a segment number', async () => {
            const response = createResponse({
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                mediaType: 'audio',
                url: 'https://cdn.example/live/init-stream3.m4s',
                data: bufferFrom([1, 2])
            });

            await intercept(response);

            expect(handledSegments.length).to.equal(1);
            const segmentInput = handledSegments[0];
            expect(segmentInput.kind).to.equal('init');
            expect(segmentInput.mediaType).to.equal('audio');
            expect(segmentInput.trackKey).to.equal('stream3');
            expect(segmentInput.segmentNumber).to.be.NaN;
        });

        it('should derive the same trackKey for an init and its media segments', async () => {
            await intercept(createResponse({
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/init-stream3.m4s',
                data: bufferFrom([1])
            }));
            await intercept(createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00289.m4s',
                data: bufferFrom([2])
            }));

            expect(handledSegments[0].trackKey).to.equal(handledSegments[1].trackKey);
            expect(handledSegments[0].trackKey).to.equal('stream3');
        });

        it('should hand the segment a private copy of the bytes', async () => {
            const values = [5, 6, 7];
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00042.m4s',
                data: bufferFrom(values)
            });

            await intercept(response);

            const segmentInput = handledSegments[0];
            expect(segmentInput.bytes.buffer).to.not.equal(response.data);

            segmentInput.bytes[0] = 99;
            expect(Array.from(new Uint8Array(response.data))).to.deep.equal(values);
        });

        it('should ignore non-segment responses and pass them through', async () => {
            const response = createResponse({
                type: HTTPRequest.MPD_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/manifest.mpd',
                data: bufferFrom([1, 2, 3])
            });

            const returned = await intercept(response);

            expect(returned).to.equal(response);
            expect(handledSegments.length).to.equal(0);
        });

        it('should ignore media types outside the configured set', async () => {
            scanner = C2paScanner(context).create({
                customParametersModel,
                segmentHandler: (segmentInput) => handledSegments.push(segmentInput),
                mediaTypes: ['video']
            });
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'audio',
                url: 'https://cdn.example/live/chunk-stream4-00001.m4s',
                data: bufferFrom([1])
            });

            await intercept(response);

            expect(handledSegments.length).to.equal(0);
        });

        it('should never propagate a handler failure to the pipeline', async () => {
            scanner = C2paScanner(context).create({
                customParametersModel,
                segmentHandler: () => {
                    throw new Error('handler blew up');
                }
            });
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00007.m4s',
                data: bufferFrom([1, 2])
            });

            const returned = await intercept(response);

            expect(returned).to.equal(response);
        });
    });

    describe('non-interference when validation degrades', function () {

        it('should pass the response through untouched while C2PA degrades to unverified without Web Crypto', async () => {
            const events = [];
            const coordinator = C2paValidationCoordinator(context).create({
                eventBus: {trigger: (type, payload) => events.push({type, payload})},
                settings: {get: () => ({streaming: {c2pa: {method: '19.4'}}})},
                isCryptoAvailable: () => false,
                loadEngine: () => Promise.resolve({
                    validateC2paSegment: async () => {
                        throw new Error('engine must not be called without Web Crypto');
                    }
                })
            });
            scanner = C2paScanner(context).create({
                customParametersModel,
                segmentHandler: coordinator.handleSegment
            });
            const values = [9, 8, 7, 6];
            const response = createResponse({
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                url: 'https://cdn.example/live/chunk-stream3-00289.m4s',
                data: bufferFrom(values)
            });

            scanner.registerInterceptor();
            const returned = await customParametersModel.interceptors[0](response);
            await Promise.resolve();

            expect(returned).to.equal(response);
            expect(Array.from(new Uint8Array(returned.data))).to.deep.equal(values);
            const record = events.find((event) => event.type === 'c2paSegmentValidated');
            expect(record.payload.status).to.equal('unverified');
        });
    });
});
