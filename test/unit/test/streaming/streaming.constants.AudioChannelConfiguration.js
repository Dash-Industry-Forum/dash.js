import getNChanFromAudioChannelConfig from '../../../../src/streaming/utils/AudioChannelConfiguration.js';
import {expect} from 'chai';

describe('AudioChannelConfiguration', function () {
    it('shall return undefined if no descriptor is provided', () => {
        expect(getNChanFromAudioChannelConfig()).to.equal(undefined);
    });

    it('shall return correct value for MPEG-D stereo', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011', value: '2' }
            )
        ).to.equal(2);
    });

    it('shall return correct value for MPEG-CICP stereo', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }
            )
        ).to.equal(2);
    });

    it('shall return correct value for MPEG-CICP multichannel', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' }
            )
        ).to.equal(5);
    });

    it('shall return correct value for MPEG-CICP 22.2', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '13' }
            )
        ).to.equal(22);
    });

    it('shall return correct value for Dolby:2011 - stereo', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: 'A000' }
            )
        ).to.equal(2);
    });

    it('shall return correct value for Dolby:2011 - 5.1', () => {
        expect(
            getNChanFromAudioChannelConfig(
                { schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: 'F802' }
            )
        ).to.equal(5);
    });

    it('shall return correct value for Dolby:2015 - mono', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'000002'}
            )
        ).to.equal(1);
    });

    it('shall return correct value for Dolby:2015 - stereo', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'000001'}
            )
        ).to.equal(2);
    });

    it('shall return correct value for Dolby:2015 - 5.0', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'000007'}
            )
        ).to.equal(5);
    });

    it('shall return correct value for Dolby:2015 - 5.1', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'000047'}
            )
        ).to.equal(5);
    });

    it('shall return correct value for Dolby:2015 - 5.1.4', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'000077'}
            )
        ).to.equal(9);
    });

    it('shall return correct value for Dolby:2015 - object audio', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dolby.com,2015:dash:audio_channel_configuration:2015', value:'800000'}
            )
        ).to.equal(24);
    });

    it('shall return correct value for DTS', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dts.com,2014:dash:audio_channel_configuration:2012', value:'6'}
            )
        ).to.equal(6);
    });

    it('shall return correct value for DTS-UHD 5.1.4', () => {
        expect(
            getNChanFromAudioChannelConfig(
                {schemeIdUri:'tag:dts.com,2018:uhd:audio_channel_configuration', value:'180A03F'}
            )
        ).to.equal(9);
    });
});
