import {expect} from 'chai';
import SwitchRequestHistory from '../../../../src/streaming/rules/SwitchRequestHistory.js';

describe('SwitchRequestHistory', () => {

    describe('Unit Tests', () => {

        describe('getSwitchRequests()', () => {
            let switchRequestHistory;

            beforeEach(() => {
                switchRequestHistory = SwitchRequestHistory({}).create()
            })

            it('should return an empty object if streamId is not provided', () => {
                expect(switchRequestHistory.getSwitchRequests(null, 'video')).to.be.empty
            })

            it('should throw a TypeError if mediaInfo is not provided', () => {
                expect(switchRequestHistory.getSwitchRequests('id', null)).to.be.empty
            })

            it('should not throw an error if streamId and mediaType are defined but there is no entry', () => {
                expect(switchRequestHistory.getSwitchRequests('id', 'video')).to.be.empty
            })
        })
    })

    describe('Integration Tests', () => {

        describe('push() and getSwitchRequests()', () => {
            let switchRequestHistory;

            beforeEach(() => {
                switchRequestHistory = SwitchRequestHistory({}).create()
            })

            it('should create an entry and make it available', () => {
                const mediaInfo = {
                    streamInfo: {
                        id: 1
                    },
                    type: 'video'
                }
                const currentRepresentation = {
                    mediaInfo,
                    id: 'id_1',
                    absoluteIndex: 4
                }
                const newRepresentation = {
                    mediaInfo,
                    id: 'id_2',
                    absoluteIndex: 2
                }
                const switchRequest = { currentRepresentation, newRepresentation };
                switchRequestHistory.push(switchRequest);

                const switchRequests = switchRequestHistory.getSwitchRequests(mediaInfo.streamInfo.id, mediaInfo.type)
                expect(switchRequests).to.not.be.empty
                expect(switchRequests).to.have.property(currentRepresentation.id)
                expect(switchRequests[currentRepresentation.id].drops).to.be.equal(1)
                expect(switchRequests[currentRepresentation.id].noDrops).to.be.equal(0)
                expect(switchRequests[currentRepresentation.id].dropSize).to.be.equal(2)
            })
        })
    })
});
