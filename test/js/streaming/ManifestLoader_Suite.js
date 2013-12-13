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



describe("Manifest Loader Suite", function () {
	var bufferController,
    context,
    system,
    manifestLoader,
    data;

	beforeEach(function () {
        system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");

		context = new Dash.di.DashContext();
		system.injectInto(context);
        manifestLoader = system.getObject('manifestLoader');
        
    });
    
    it("manifestLoader returns a valid mpd", function () { 
		var source = "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd";
        manifestLoader.load(source).then(
                function (manifestResult) {
                 expect(festResult.xmlns).toEqual("urn:mpeg:DASH:schema:MPD:2011");
                  expect(festResult.type).toEqual("static");
                  expect(festResult.minBufferTime).toEqual(5.001);
                  expect(festResult.mediaPresentationDuration).toEqual(260.266);
                  expect(festResult.profiles).toEqual("urn:mpeg:dash:profile:isoff-live:2011");
                  expect(festResult.profiles).toEqual("urn:mpeg:dash:profile:isoff-live:2011");

                  //AdaptationSet set1
                 
                  expect(festResult.Period.AdaptationSet[0].mimeType).toEqual("video/mp4");
                  expect(festResult.Period.AdaptationSet[0].segmentAlignment).toBeTruthy();
                  expect(festResult.Period.AdaptationSet[0].startWithSAP).toEqual(1);
                  expect(festResult.Period.AdaptationSet[0].SegmentTemplate.duration).toEqual(360000);
                  expect(festResult.Period.AdaptationSet[0].SegmentTemplate.startNumber).toEqual(0);
                  expect(festResult.Period.AdaptationSet[0].Representation[0].id).toEqual("video1");
                  expect(festResult.Period.AdaptationSet[0].Representation[0].codecs).toEqual("avc1.4D4020");
                  expect(festResult.Period.AdaptationSet[0].Representation[0].width).toEqual(1280);
                  expect(festResult.Period.AdaptationSet[0].Representation[0].height).toEqual(720);
                  expect(festResult.Period.AdaptationSet[0].Representation[0].bandwidth).toEqual(3000000);
                  expect(festResult.Period.AdaptationSet[0].Representation[1].id).toEqual("video2");
                  expect(festResult.Period.AdaptationSet[0].Representation[1].codecs).toEqual("avc1.4D401F");
                  expect(festResult.Period.AdaptationSet[0].Representation[1].width).toEqual(1024);
                  expect(festResult.Period.AdaptationSet[0].Representation[1].height).toEqual(576);

                  //AdaptationSet set2
                  expect(festResult.Period.AdaptationSet[1].mimeType).toEqual("audio/mp4");
                  expect(festResult.Period.AdaptationSet[1].codecs).toEqual(undefined);
                  expect(festResult.Period.AdaptationSet[1].startWithSAP).toEqual(1);
                  expect(festResult.Period.AdaptationSet[1].SegmentTemplate.duration).toEqual(192000);
                  expect(festResult.Period.AdaptationSet[1].SegmentTemplate.startNumber).toEqual(0);
                  expect(festResult.Period.AdaptationSet[1].SegmentTemplate.media).toEqual("$RepresentationID$/$Number$.m4s");
                  expect(festResult.Period.AdaptationSet[1].SegmentTemplate.initialization).toEqual("$RepresentationID$/Header.m4s");
                  expect(festResult.Period.AdaptationSet[1].Representation.id).toEqual("audio");
                  expect(festResult.Period.AdaptationSet[1].Representation.bandwidth).toEqual(56000);
        });        
       
	});

    if(window.location.href.indexOf("runner.html")==0)
     {
            describe("manifest Loader Negative Test Suite", function(){
                it("manifestLoader with invalid url", function () {  
                    url=null;
                    manifestLoader.load(url).then(
                            function (manifestResult) {
                        expect(manifestResult).toEqual(null);
                    });
                   
                });  
            });
     }    
   
});
    
    