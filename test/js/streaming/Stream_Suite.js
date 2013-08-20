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
 

describe("Stream test Suite", function () {
	var ManifestLoader,metricsModel,parser,manifestObj,period,manifestExt,debug,player,videoDataObj,videotag,codec,mediaSource,primaryAudioDataObj,url,server;

	beforeEach(function () {
     	period = 0;

		system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");
		context = new Dash.di.DashContext();
		system.injectInto(context);
        ManifestLoader = system.getObject('manifestLoader');
       
        url = streams["envivio"].url;
      
        manifestObj = null;
        manifestExt =  system.getObject("manifestExt");
 
		ManifestLoader.load(url).then(
		function (manifestResult) {
			manifestObj = manifestResult;
		});
	});
	
    
	it("Prerequisites for Main Function Initilaised",function(){
		var browserVersion = parseBrowserVersion( location.search );
		initStreamData();
		expect(browserVersion.toLowerCase()).toEqual("stable");
		for (first in streams) break;
        if(window.location.href.indexOf("runner.html")>0)
		 expect(streams[first].isLive).toEqual(false);
        else
          expect(streams[first].isLive).toEqual(true);
		
	});
	
	it("ManifestObj Initilaised",function(){
		ManifestLoader.load(url).then(
			function (manifestResult) {
				waitsFor(function () {
					if (manifestObj) return true;
				}, "data is null", 100);
				runs(function () {
					expect(manifestObj.Period.BaseURL).toEqual("http://dash.edgesuite.net/envivio/dashpr/clear/");
				});
			});
	});
	it("Audio-Data Initilaised",function(){
       ManifestLoader.load(url).then(
			function (manifestResult) {
				waitsFor(function () {
					if (manifestObj) return true;
				}, "data is null", 100);
				runs(function () {
					manifestExt.getAudioDatas(manifestObj, period).then(function (audioDatas) {
				    expect(audioDatas[0].mimeType).toContain('audio');
				 });
			});
        });
	}); 
	
	it("Audio-Track Index Set",function(){
        ManifestLoader.load(url).then(
			function (manifestResult) {
				waitsFor(function () {
					if (manifestObj) return true;
				}, "data is null", 100);
				runs(function () {
					manifestExt.getPrimaryAudioData(manifestObj, period).then( function (primaryAudioData) {
                    primaryAudioDataObj = primaryAudioData;
                    manifestExt.getDataIndex(primaryAudioDataObj,manifestObj).then(
                        function (index) {
                            expect(isNaN(index)).not.toBeTruthy();
                    }); 
			    });
			});
        });
	}); 
		
	it("Audio-Codec Initilaised",function(){
        ManifestLoader.load(url).then(
			function (manifestResult) {
				waitsFor(function () {
					if (manifestObj) return true;
				}, "data is null", 100);
				runs(function () {
					manifestExt.getPrimaryAudioData(manifestObj, period).then( function (primaryAudioData) {
                    canRunBool = '';
                    manifestExt.getCodec(primaryAudioDataObj).then(
                        function (codec) {
                            return codec;
                    }).then(function(codec){;
                        canRunBool = player.capabilities.supportsCodec(videotag[0],codec);
                        return codec;
                    }).then(function(codec){
                        if(canRunBool){
                            expect(codec).toContain('audio');
                        }
                    }); 
			    });
			});
        });
	});
	
	it("Duration initilaised",function(){
        ManifestLoader.load(url).then(
			function (manifestResult) {
				waitsFor(function () {
					if (manifestObj) return true;
				}, "data is null", 100);
				runs(function () {
					manifestExt.getDuration(manifestObj, false).then(function (duration) {
				    expect(isNaN(duration)).not.toBeTruthy();
			        });
			    });
			});
	});
	
  describe("Stream test Suite for Events", function () {
		var tape,result,stream,video,startFlg,seekFlag,timeout;
		beforeEach(function(){
			startFlg = false;
			video = system.getObject("videoModel");
            
            element = document.createElement('video');
             video.setElement($(element)[0]);  
		
			stream = system.getObject("stream");
			spyOn(video, 'play').andCallThrough();
			spyOn(video, 'pause').andCallThrough();
			stream.setPeriodIndex(period);
			stream.load(url);
			
			setTimeout(function(){
				startFlg = true;
			},100);
		});
		
	});
});
