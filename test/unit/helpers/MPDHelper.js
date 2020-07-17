import SpecHelper from './SpecHelper.js';

class MpdHelper {
    constructor() {
        this.SEGMENT_TEMPLATE = 0;
        this.idCounter = -1;
        this.baseUrl = 'https://dash.akamaized.net/envivio/dashpr/clear/Manifest.mpd';
        this.specHelper = new SpecHelper();
    }

    getMpd(type) {
        var mpd = {};

        mpd.type = type;
        mpd.minimumUpdatePeriod = 10;
        mpd.loadedTime = this.specHelper.getUnixTime();
        mpd.Period_asArray = [this.composePeriod()];

        return mpd;
    }

    getMimeForType(type) {
        var mime = null;

        switch (type) {
            case 'video': {
                mime = 'video/mp4';
                break;
            }
            case 'audio': {
                mime = 'audio/mp4';
                break;
            }
            case 'text': {
                //TODO
                break;
            }
        }

        return mime;
    }

    getIdForType(type) {
        return type + (++this.idCounter);
    }

    getCodecsForType(type) {
        var codecs = [];

        switch (type) {
            case 'video': {
                codecs.push('avc1.4D400D');
                codecs.push('avc1.4D4015');
                codecs.push('avc1.4D401E');
                codecs.push('avc1.4D401F');
                codecs.push('avc1.4D4020');
                break;
            }
            case 'audio': {
                //TODO
                break;
            }
            case 'text': {
                //TODO
                break;
            }
        }

        return codecs;
    }

    composePeriod() {
        var period = {};

        period.AdaptationSet_asArray = [this.getAdaptationForSegmentInfoType('video', this.SEGMENT_TEMPLATE)];

        return period;
    }

    composeAdaptation(type) {
        var adaptation = {};
        var objRepresentation = [];
        var objSubRepresentation = [];
        var codecs = this.getCodecsForType(type);
        var mime = this.getMimeForType(type);

        adaptation.BaseURL = this.baseUrl;
        adaptation.__cnt = 20;
        adaptation.__text = '';
        adaptation.maxFrameRate = 25;
        adaptation.maxHeight = 720;
        adaptation.maxWidth = 1280;
        adaptation.mimeType = mime;
        adaptation.par = '16:9';
        adaptation.segmentAlignment = 'true';
        adaptation.startWithSAP = 1;

        objSubRepresentation.__cnt = 8;
        objSubRepresentation.bandwidth = 349952;
        objSubRepresentation.codecs = codecs[0];
        objSubRepresentation.frameRate = 25;
        objSubRepresentation.height = 180;
        objSubRepresentation.id = this.getIdForType(type);
        objSubRepresentation.mimeType = mime;
        objSubRepresentation.sar = '1:1';
        objSubRepresentation.scanType = 'progressive';
        objSubRepresentation.width = 320;
        objRepresentation.push(objSubRepresentation);
        objSubRepresentation = [];
        objSubRepresentation.BaseURL = this.baseUrl;
        objSubRepresentation.__cnt = 8;
        objSubRepresentation.bandwidth = 600000;
        objSubRepresentation.codecs = codecs[1];
        objSubRepresentation.frameRate = 25;
        objSubRepresentation.height = 270;
        objSubRepresentation.id = this.getIdForType(type);
        objSubRepresentation.mimeType = mime;
        objSubRepresentation.sar = '1:1';
        objSubRepresentation.scanType = 'progressive';
        objSubRepresentation.width = 480;
        objRepresentation.push(objSubRepresentation);
        objSubRepresentation = [];
        objSubRepresentation.BaseURL = this.baseUrl;
        objSubRepresentation.__cnt = 8;
        objSubRepresentation.bandwidth = 1000000;
        objSubRepresentation.codecs = codecs[2];
        objSubRepresentation.frameRate = 25;
        objSubRepresentation.height = 396;
        objSubRepresentation.id = this.getIdForType(type);
        objSubRepresentation.mimeType = mime;
        objSubRepresentation.sar = '1:1';
        objSubRepresentation.scanType = 'progressive';
        objSubRepresentation.width = 704;
        objRepresentation.push(objSubRepresentation);
        objSubRepresentation = [];
        objSubRepresentation.BaseURL = this.baseUrl;
        objSubRepresentation.__cnt = 8;
        objSubRepresentation.bandwidth = 2000000;
        objSubRepresentation.codecs = codecs[3];
        objSubRepresentation.frameRate = 25;
        objSubRepresentation.height = 576;
        objSubRepresentation.id = this.getIdForType(type);
        objSubRepresentation.mimeType = mime;
        objSubRepresentation.sar = '1:1';
        objSubRepresentation.scanType = 'progressive';
        objSubRepresentation.width = 1024;
        objRepresentation.push(objSubRepresentation);
        objSubRepresentation = [];
        objSubRepresentation.BaseURL = this.baseUrl;
        objSubRepresentation.__cnt = 8;
        objSubRepresentation.bandwidth = 3000000;
        objSubRepresentation.codecs = codecs[4];
        objSubRepresentation.frameRate = 25;
        objSubRepresentation.height = 720;
        objSubRepresentation.id = this.getIdForType(type);
        objSubRepresentation.mimeType = mime;
        objSubRepresentation.sar = '1:1';
        objSubRepresentation.scanType = 'progressive';
        objSubRepresentation.width = 1280;
        objRepresentation.push(objSubRepresentation);

        adaptation.Representation = objRepresentation;
        adaptation.Representation_asArray = objRepresentation;

        return adaptation;
    }

    addSegmentTemplateToAdaptation(adaptation) {
        let objSegmentTemplate = {};
        let reps = adaptation.Representation_asArray;
        let ln = reps.length;
        let i = 0;
        let r;

        objSegmentTemplate.__cnt = 6;
        objSegmentTemplate.duration = 360000;
        objSegmentTemplate.initialization = '$RepresentationID$/Header.m4s';
        objSegmentTemplate.media = '$RepresentationID$/$Number$.m4s';
        objSegmentTemplate.presentationTimeOffset = 0;
        objSegmentTemplate.startNumber = 0;
        objSegmentTemplate.timescale = 90000;

        adaptation.SegmentTemplate = objSegmentTemplate;
        adaptation.SegmentTemplate_asArray = objSegmentTemplate;

        for (i; i < ln; i++) {
            r = reps[i];
            r.SegmentTemplate = objSegmentTemplate;
        }

        return adaptation;
    }

    getAdaptationForSegmentInfoType(type, segmentInfo) {
        var adaptation = this.composeAdaptation(type);

        switch (segmentInfo) {
            case this.SEGMENT_TEMPLATE: {
                adaptation = this.addSegmentTemplateToAdaptation(adaptation);
                return adaptation;
            }
            default: {
                return null;
            }
        }
    }

    getAdaptationWithSegmentTemplate(type) {
        return this.getAdaptationForSegmentInfoType(type, this.SEGMENT_TEMPLATE);
    }
}

export default MpdHelper;
