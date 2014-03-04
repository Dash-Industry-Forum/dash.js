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

if(window.location.href.indexOf("runner.html")>0)
{
    describe("Buffer Controller Suite", function () {
            var bufferController,
            context,
            obj,
            element,
			video,
			source,
            stream,
			requestScheduler,
			streamController,
			periodInfo = {},
            system;
     
            beforeEach(function () {
				debugger;
                system = new dijon.System();
                system.mapValue("system", system); 
                system.mapOutlet("system");
                context = new Dash.di.DashContext();
                system.injectInto(context);
				
				bufferController = system.getObject('bufferController');
				requestScheduler = system.getObject('requestScheduler');
				bufferController.setScheduler(requestScheduler);
				streamController = system.getObject('streamController');
				
				element = document.createElement('video');
				(element).autoplay = true;
				video = system.getObject("videoModel");
				video.setElement((element));
				
				stream = createObject(system);
            });
            
           
            it("creating buffer controller object by setting  ready true and calling do start", function () {
				debugger;
				bufferController.start();
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList[0].starttype).toBe("initial_start");				
            });
            
			it("creating buffer controller object by setting  ready true and calling do seek", function () {                
				//bufferController.seek(77.42845916748047); --Commented because already load is happening,
			    currentTime = new Date();
			    var playlist=bufferController.metricsModel.addPlayList(bufferController.getType(), currentTime, 0, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
			    expect(playlist.starttype).toBe("seek");
            });
			
             it("creating buffer controller object by setting started false and ready true", function () {
			    currentTime = new Date();
			    var playlist=bufferController.metricsModel.addPlayList(bufferController.getType(), currentTime, 0, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
			    expect(playlist.starttype).toBe("seek");
            });
            
            it("checking object data with input 0", function () {
				bufferController.seek(0); 
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList[0].mstart).toBe(0);
            });  

            it("checking object data with input in between", function () {
				bufferController.seek(77.42845916748047); 
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList[0].mstart).toBe(77.42845916748047);
            });
            
            it("seek with multiple values", function () {
				bufferController.seek(77.42845916748047); 
				bufferController.seek(235.2941176470588); 
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList.length).toBe(2);
            });
            
             it("checking object data with input with full duration", function () {
				bufferController.seek( 259.3207092285156); 
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList[0].mstart).toBe( 259.3207092285156);
            });
           
            it("creating buffer controller object by setting  ready true and calling do stop", function () {
				bufferController.stop();
				expect(bufferController.metricsModel.getMetricsFor(undefined).PlayList.length).toBe(0);
            });
			
			it("Check on buffer completion", function () {
				debugger;
				streamController.setVideoModel(video);
				streamController.load(testUrl);
				waits(1000);
				waitsFor(function(){
					if(streamController.getManifestExt() != undefined) return true;
				},"manifest is not loaded",100);
				runs(function(){
					debugger;
					streamController.play();
					expect(bufferController.isBufferingCompleted()).toBe(false);	
				});    
            });
			
			it("Check buffer State without start", function () {
				debugger;
				streamController.setVideoModel(video);
				streamController.load(testUrl);
				waits(1000);
				waitsFor(function(){
					if(streamController.getManifestExt() != undefined) return true;
				},"manifest is not loaded",100);
				runs(function(){
					debugger;
					//streamController.play();
					expect(bufferController.isReady()).toBe(false);	
				});    
            });
			
			it("Check buffer State after start", function () {
				debugger;
				streamController.setVideoModel(video);
				streamController.load(testUrl);
				waits(1000);
				waitsFor(function(){
					if(streamController.getManifestExt() != undefined) return true;
				},"manifest is not loaded",100);
				runs(function(){
					debugger;
					bufferController.start();
					expect(bufferController.isReady()).toBe(false);	
				});    
            });
			
			it("Check segments count for duration", function () {
				var indexHandler = system.getObject("indexHandler"), 
				quality = 0, 
				requiredDuration = 10, 
				bufferedDuration = 0;
				indexHandler.getSegmentCountForDuration(quality,manifestRes.Period_asArray[0].AdaptationSet_asArray[0],requiredDuration,bufferedDuration).then(function(count)
				{
					expect(isNaN(count)).not.toBeTruthy();
				});				
            });
			
			it("Get current time for the fragment", function () {
				debugger;
				var indexHandler = system.getObject("indexHandler"), 
				quality = 1;
				waitsFor(function(){
					if (manifestRes != undefined) return true;
				},"waiting for manifest",100);
				
				runs(function(){
					debugger;
					indexHandler.getCurrentTime(manifestRes.Period_asArray[0].AdaptationSet_asArray[0]).then(function(time)
					{
						debugger;
						expect(isNaN(count)).not.toBeTruthy();
					});
				});
								
            });
            
            //Negative test cases
            
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out  type parameters", function () {
				currentTime = new Date();
				var playlist=bufferController.metricsModel.addPlayList("", currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				expect(playlist.starttype).toBe("initial_start");
            });
            
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out time and type parameters ", function () {
				var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				expect(playlist.starttype).toBe("initial_start");
            });
           
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out time, seektarget and type parameters ", function () {
				var playlist=bufferController.metricsModel.addPlayList("", null, null, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				expect(playlist.starttype).toBe("initial_start");
            });
            
            it("creating buffer controller object by setting  ready true and calling addPlayList with all parameters null", function () {
				var playlist=bufferController.metricsModel.addPlayList("", null, null, null);
				expect(playlist.starttype).toBe(null);
            });
            
			it("checking play list trace with initial start playlist and User Request Stop Reason", function () {
                currentTime = new Date();
				var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				var playlisttrace = bufferController.metricsModel.appendPlayListTrace(playlist,0,0,currentTime,0,0,0,MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
				expect(playlisttrace.stopreason).toBe("user_request");
            });
			
			it("checking play list trace with initial start playlist and Representation Switch Stop Reason", function () {
                currentTime = new Date();
				var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				var playlisttrace = bufferController.metricsModel.appendPlayListTrace(playlist,0,0,currentTime,0,0,0,MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
				expect(playlisttrace.stopreason).toBe("representation_switch");
            });
			
			it("checking play list trace with initial start playlist and End of Content Stop Reason", function () {
                currentTime = new Date();
				var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				var playlisttrace = bufferController.metricsModel.appendPlayListTrace(playlist,0,0,currentTime,0,0,0,MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
				expect(playlisttrace.stopreason).toBe("end_of_content");
            });
			
			it("checking play list trace with initial start playlist and Rebuffering Stop Reason", function () {
                currentTime = new Date();
				var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
				var playlisttrace = bufferController.metricsModel.appendPlayListTrace(playlist,0,0,currentTime,0,0,0,MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
				expect(playlisttrace.stopreason).toBe("rebuffering");
            });
			
			it("Buffer Initialization to Auto Switch Bitrate", function () {
                debugger;
                currentTime = new Date();
				var fragmentController = system.getObject('fragmentController');
				var manifestModel = system.getObject('manifestModel');
				manifestModel.setValue(manifestRes);
				bufferController.setFragmentController(fragmentController);
				bufferController.initialize("video",0,manifestRes.Period.AdaptationSet[0],null,stream.getVideoModel(),requestScheduler,fragmentController,null);
				waitsFor(function(){
					if(bufferController.getAutoSwitchBitrate() != undefined)
					return true;
				},"buffer getting initialized,100");
				runs(function(){
					expect(bufferController.getAutoSwitchBitrate()).toBe(true);
				}); 
			});	
			
			it("Min buffer time",function(){
				debugger;
				var manifestModel = system.getObject("manifestModel");
		
				manifestModel.setValue(manifestRes);
				bufferController.initialize("video",0,manifestRes.Period.AdaptationSet[0],null,null,null,null,null);
				
				waitsFor(function(){
					if (bufferController.getMinBufferTime() != undefined) return true;
				},"bufferController is not initialized",100);
				runs(function(){
					debugger;
					var result = bufferController.getMinBufferTime();
					expect(isNaN(result)).not.toBeTruthy();
				});	
			});
			
			it("Resetting buffer",function(){
				var fragmentController = system.getObject('fragmentController');
				
				bufferController.setVideoModel(video);
				bufferController.setFragmentController(fragmentController);
				
				spyOn(bufferController, 'reset').andCallThrough();
				bufferController.reset(true);
				
				expect(bufferController.reset).toHaveBeenCalled();
				expect(bufferController.reset).toHaveBeenCalledWith(true);
				expect(bufferController.reset.callCount).toEqual(1);
			});
			
			it("Resetting buffer without errored",function(){
				debugger;
				var fragmentController = system.getObject('fragmentController');
				
				bufferController.setVideoModel(video);
				bufferController.setFragmentController(fragmentController);
				
				bufferController.reset(false);
				expect(bufferController.updateBufferState()).not.toBeDefined();
			});
			
			
		it("attach Buffer and check the status of buffer",function(){
			debugger;
			var mediaSourceExt, sourceBufferExt , mediaSource, buffer, codec = "video/mp4;codecs="+"avc1.4D400D" , bufferController,requestScheduler,manifestModel;
			
			mediaSourceExt = system.getObject("mediaSourceExt");
			sourceBufferExt = system.getObject("sourceBufferExt");
			bufferController = system.getObject("bufferController");
			requestScheduler = system.getObject("requestScheduler");
			manifestModel = system.getObject("manifestModel");
			var fragmentController = system.getObject("fragmentController");
			
			manifestModel.setValue(manifestRes);
			
			bufferController.initialize("video",0,manifestRes.Period.AdaptationSet[0],null,video,requestScheduler,fragmentController,null);				
			waits(1000);
			waitsFor(function(){
				debugger;
				if (bufferController.getMinBufferTime() != undefined) return true;
			},"waiting for buffer initialization",100);
			runs(function(){
				debugger;
				var result = bufferController.isReady();
				expect(result).toBeTruthy();
			});
		});
		
		it("attach Buffer and buffer completion status",function(){
			var mediaSourceExt, sourceBufferExt , mediaSource, buffer, codec = "video/mp4;codecs="+"avc1.4D400D" , bufferController,requestScheduler,manifestModel;
			
			mediaSourceExt = system.getObject("mediaSourceExt");
			sourceBufferExt = system.getObject("sourceBufferExt");
			bufferController = system.getObject("bufferController");
			requestScheduler = system.getObject("requestScheduler");
			manifestModel = system.getObject("manifestModel");
			var fragmentController = system.getObject("fragmentController");
			
			manifestModel.setValue(manifestRes);
			
			bufferController.initialize("video",0,manifestRes.Period.AdaptationSet[0],null,video,requestScheduler,fragmentController,null);				
			waits(1000);
			waitsFor(function(){
				if (bufferController.getMinBufferTime() != undefined) return true;
			},"waiting for buffer initialization",100);
			runs(function(){
				var result = bufferController.isBufferingCompleted();
				expect(result).not.toBeTruthy();
			});
		});
		
		it("attach Buffer and buffer completion status",function(){
			var mediaSourceExt, sourceBufferExt , mediaSource, buffer, codec = "video/mp4;codecs="+"avc1.4D400D" , bufferController,requestScheduler,manifestModel;
			
			mediaSourceExt = system.getObject("mediaSourceExt");
			sourceBufferExt = system.getObject("sourceBufferExt");
			bufferController = system.getObject("bufferController");
			requestScheduler = system.getObject("requestScheduler");
			manifestModel = system.getObject("manifestModel");
			var fragmentController = system.getObject("fragmentController");
			
			manifestModel.setValue(manifestRes);
			
			
		});
		
		
		/** Commented as SetData method is removed in bufferController.js
		it("Check Data",function(){
			debugger;
			bufferController.setData(manifestRes.Period.AdaptationSet[0]).then(function(){
				expect(bufferController.getData() === manifestRes.Period.AdaptationSet[0]).toBeTruthy();				
			});
		}); **/
			
		function createObject(system) {
			debugger;
			periodInfo.index = 0;
			periodInfo.id = 0;
			stream = system.getObject("stream");
			stream.setVideoModel(video);
			//stream.setPeriodIndex(0);
			//periodIndex = stream.getPeriodIndex();
			stream.load(manifestRes,periodInfo);
			return stream;
        
		} 
      });
 
     
      

   }  
     
 
      
