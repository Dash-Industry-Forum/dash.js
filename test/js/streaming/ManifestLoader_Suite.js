// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc.
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

//This class parses the MPDs using DashParser framework.

describe("Manifest Loader Suite", function () {
	var bufferController,
    context,
    system,
    url,
    manifestLoader,
    data;

	beforeEach(function () {
        system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");

		context = new Dash.di.DashContext();
		system.injectInto(context);
        manifestLoader = system.getObject('manifestLoader');
        
        url = "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd";
    });
    
    it("manifestLoader returns a valid mpd", function () {        
        manifestLoader.load(url).then(
                function (manifestResult) {
            expect(manifestResult.xmlns).toEqual("urn:mpeg:dash:schema:mpd:2011");
			expect(manifestResult.type).toEqual("static");
			expect(manifestResult.minBufferTime).toEqual(2);
			expect(manifestResult.mediaPresentationDuration).toEqual(234);
			expect(manifestResult.profiles).toEqual("urn:mpeg:dash:profile:isoff-live:2011");

			//AdaptationSet set1
			expect(manifestResult.Period.AdaptationSet[0].mimeType).toEqual("video/mp4");
			expect(manifestResult.Period.AdaptationSet[0].segmentAlignment).toBeTruthy();
			expect(manifestResult.Period.AdaptationSet[0].startWithSAP).toEqual(1);
			expect(manifestResult.Period.AdaptationSet[0].SegmentTemplate.duration).toEqual(2);
			expect(manifestResult.Period.AdaptationSet[0].SegmentTemplate.startNumber).toEqual(1);
			expect(manifestResult.Period.AdaptationSet[0].SegmentTemplate.media).toEqual("video_$Number$_$Bandwidth$bps.mp4");
			expect(manifestResult.Period.AdaptationSet[0].SegmentTemplate.initialization).toEqual("video_$Bandwidth$bps.mp4");
			expect(manifestResult.Period.AdaptationSet[0].Representation[0].id).toEqual("v0");
			expect(manifestResult.Period.AdaptationSet[0].Representation[0].codecs).toEqual("avc1.4d401e");
			expect(manifestResult.Period.AdaptationSet[0].Representation[0].width).toEqual(720);
			expect(manifestResult.Period.AdaptationSet[0].Representation[0].height).toEqual(576);
			expect(manifestResult.Period.AdaptationSet[0].Representation[0].bandwidth).toEqual(900000);
			expect(manifestResult.Period.AdaptationSet[0].Representation[1].id).toEqual("v1");
			expect(manifestResult.Period.AdaptationSet[0].Representation[1].codecs).toEqual("avc1.4d401e");
			expect(manifestResult.Period.AdaptationSet[0].Representation[1].width).toEqual(720);
			expect(manifestResult.Period.AdaptationSet[0].Representation[1].height).toEqual(576);
			expect(manifestResult.Period.AdaptationSet[0].Representation[1].bandwidth).toEqual(500000);

			//AdaptationSet set2
			expect(manifestResult.Period.AdaptationSet[1].mimeType).toEqual("audio/mp4");
			expect(manifestResult.Period.AdaptationSet[1].codecs).toEqual("mp4a.40.5");
			expect(manifestResult.Period.AdaptationSet[1].segmentAlignment).toBeTruthy();
			expect(manifestResult.Period.AdaptationSet[1].startWithSAP).toEqual(1);
			expect(manifestResult.Period.AdaptationSet[1].SegmentTemplate.duration).toEqual(2);
			expect(manifestResult.Period.AdaptationSet[1].SegmentTemplate.startNumber).toEqual(1);
			expect(manifestResult.Period.AdaptationSet[1].SegmentTemplate.media).toEqual("audio_$Number$_$Bandwidth$bps_Input_2.mp4");
			expect(manifestResult.Period.AdaptationSet[1].SegmentTemplate.initialization).toEqual("audio_$Bandwidth$bps_Input_2.mp4");
			expect(manifestResult.Period.AdaptationSet[1].Representation.id).toEqual("a2");
			expect(manifestResult.Period.AdaptationSet[1].Representation.bandwidth).toEqual(56000);
        });        
       
	});
   
});
    
    