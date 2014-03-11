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
describe("Fragment Controller Suite", function () {
        var fragmentController,
           context,
           system,
		   request = {},
		   requests = {},
		   bytes,
           flag,
		   video,
		   currentDate = new Date(),
		   bufferController,
		   element;
 
        beforeEach(function () {
			debugger;
		    system = new dijon.System();
		    system.mapValue("system", system); 
		    system.mapOutlet("system");
		    context = new Dash.di.DashContext();
		    system.injectInto(context);
		    fragmentController=system.getObject('fragmentController');
			bufferController = system.getObject('bufferController');
		    video = system.getObject("videoModel");
        });
  
      it("process", function(){
		debugger;
         var bytes=new ArrayBuffer(612);
   
         var promise = null,
           success,
           successResult,
           failure;
   
         success = function(result) {
			debugger;
            successResult = result;
            flag = true;
           },
         failure = function(error) {
			debugger;
            flag = false;
           };
         runs(function(){
           promise =  fragmentController.process(bytes);
           promise.then(success, failure);
          });
  
          waitsFor(function(){
           return flag;
          },"",500);
  
          runs(function(){
			debugger;
           expect(successResult).toEqual(new Uint8Array(bytes));
          });
     });
     
     it("process with bytes as null", function(){
        var promise = null,
           success,
           successResult,
           failure;
   
         success = function(result) {
            successResult = result;
            flag = true;
           },
         failure = function(error) {
            flag = false;
           };
         runs(function(){
           promise =  fragmentController.process(null);
           promise.then(success, failure);
          });
  
          waitsFor(function(){
           return flag;
          });
  
          runs(function(){
           expect(successResult).toEqual(null);
          });
     });
	 
	it("Check if its initialization Request with initialization Request type",function(){
		debugger; 
		var request = {};
		request.action ="download";
		request.streamType="video";
		request.type="Initialization Segment";
		request.url=testUrl;

		var result = fragmentController.isInitializationRequest(request);
		expect(result).toBeTruthy();
	});
	
	it("Check if its initialization Request without initialization Request type",function(){
		debugger; 
		var request = {};
		request.action ="download";
		request.streamType="video";
		request.url=testUrl;
		
		var result = fragmentController.isInitializationRequest(request);
		expect(result).not.toBeTruthy();
	 });
	 
	it("Check if its initialization Request with invalid initialization Request type",function(){
		debugger; 
		var request = {};
		request.action ="download";
		request.streamType="video";
		request.type="";
		request.url=testUrl;
		
		var result = fragmentController.isInitializationRequest(request);
		expect(result).toBe("");
	});
	
	it("Check if fragment is loaded or pending without buffer and actual request",function(){
		var result = fragmentController.isFragmentLoadedOrPending(bufferController,request);
		expect(result).not.toBeTruthy();
	});
	
	if(window.location.href.indexOf("runner.html")>0)
	{
		it("Process - Check bytes per element for a fragment",function(){
			debugger;
			GetBytes();
			waitsFor(function(){
				if (bytes != undefined) return true;
			},"bytes are null",100);
			runs(function(){
				debugger;
				fragmentController.process(bytes).then(function(result){
					debugger;
					expect(result.BYTES_PER_ELEMENT).toBe(1);
				});
			});
		});
	
		it("Process - Check bytes length for a fragment",function(){
			debugger;
			if(bytes == undefined) 
			{
				GetBytes();
			}
			waitsFor(function(){
				if (bytes != undefined) return true;
			},"bytes are null",100);
			runs(function(){
				debugger;
				fragmentController.process(bytes).then(function(result){
					debugger;
					expect(isNaN(result.length)).not.toBeTruthy();
				});
			});
		});
	}


	
	it("attachBufferController",function(){
		var requestcheduler,manifestModel;
		manifestModel= system.getObject("manifestModel");
		manifestModel.setValue(manifestRes);
		fragmentController.attachBufferController(bufferController);
		requests = getRequest();
		requests.action="download";
		var result = fragmentController.isFragmentLoadedOrPending(bufferController,requests);
		expect(result).not.toBeTruthy();
	});
	
	it("getPendingRequests",function(){
		var requestcheduler,manifestModel;
		manifestModel= system.getObject("manifestModel");
		manifestModel.setValue(manifestRes);
		fragmentController.attachBufferController(bufferController);


		var result = fragmentController.getPendingRequests(bufferController);
		expect(result.length).toEqual(0);
	});
	
	it("getLoadingRequests",function(){
		var requestcheduler,manifestModel;
		manifestModel= system.getObject("manifestModel");
		manifestModel.setValue(manifestRes);
		fragmentController.attachBufferController(bufferController);


		var result = fragmentController.getLoadingRequests(bufferController);
		expect(result.length).toEqual(0);
	});
	
	it("getLoadingTime",function(){
		debugger;
		var requestcheduler,manifestModel;
		manifestModel= system.getObject("manifestModel");
		manifestModel.setValue(manifestRes);
		fragmentController.attachBufferController(bufferController);


		var result = fragmentController.getLoadingTime(bufferController);
		expect(result).toMatch(0);
	});
	
	it("getExecutedRequestForTime",function(){
		debugger;
		var requestcheduler,manifestModel,fragmentModel;
		manifestModel= system.getObject("manifestModel");
		fragmentModel = system.getObject("fragmentModel");
		manifestModel.setValue(manifestRes);
	
		requests = getRequest();

		var onLoadingStart = function(){return true},executeReqTime=currentDate.setMinutes(currentDate.getMinutes() + 10);
		fragmentModel.addRequest(requests);	
		fragmentModel.setCallbacks(onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart);
		fragmentModel.executeCurrentRequest();
		var res = fragmentController.getExecutedRequestForTime(fragmentModel,executeReqTime);
		expect(res === requests).toBeTruthy();
	});
	
	it("getExecutedRequestForTime without actual model",function(){
		var res = fragmentController.getExecutedRequestForTime(null,null);
		expect(res).toBe(null);
	});
	
	it("removeExecutedRequest",function(){
		debugger;
		var fragmentModel = system.getObject("fragmentModel");
		requests = getRequest();
		
		var onLoadingStart = function(){return true};		
		fragmentModel.addRequest(requests);		
		fragmentModel.setCallbacks(onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart);
		fragmentModel.executeCurrentRequest();
		fragmentController.removeExecutedRequest(fragmentModel,requests);
		var res = fragmentModel.getLoadingTime();
		expect(res).toEqual(0);
	});
	
	it("removeExecutedRequestsBeforeTime",function(){
		debugger;
		var fragmentModel = system.getObject("fragmentModel");
		var onLoadingStart = function(){return true},executeReqTime=currentDate.setMinutes(currentDate.getMinutes() + 10);;
		requests = getRequest();
		fragmentModel.addRequest(requests);		
		fragmentModel.setCallbacks(onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart);
		fragmentModel.executeCurrentRequest();
		fragmentController.removeExecutedRequest(fragmentModel,executeReqTime);
		var res = fragmentModel.getLoadingTime();
		expect(res).toEqual(0);	
	});
	
	it("cancelPendingRequestsForModel",function(){
		var fragmentModel = system.getObject("fragmentModel");
		requests = getRequest();
		fragmentModel.addRequest(requests);	
		fragmentController.cancelPendingRequestsForModel(fragmentModel);
		var res = fragmentModel.getPendingRequests();
		expect(res.length === 0).toBeTruthy();
	});
	
	it("abortRequestsForModel",function(){
		var onLoadingStart = function(){return true};
		var fragmentModel = system.getObject("fragmentModel");
		requests = getRequest();
		fragmentModel.addRequest(requests);	
		fragmentModel.setCallbacks(onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart);		
		fragmentController.abortRequestsForModel(fragmentModel);
		var res = fragmentModel.getLoadingRequests();
		expect(res.length === 0).toBeTruthy();
	});
	
	it("prepare Fragment For Loading with buffer",function(){
		debugger;
		var onLoadingStart = function(){return true};
		requests = getRequest();
		fragmentController.attachBufferController(bufferController);
		fragmentController.prepareFragmentForLoading(bufferController,requests,onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart).then(function(result){
			expect(result).toBeTruthy();
		});
	});
	
	it("prepare Fragment For Loading without buffer",function(){
		debugger;
		var onLoadingStart = function(){return true};
		requests = getRequest();
		fragmentController.prepareFragmentForLoading(bufferController,requests,onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart).then(function(result){
			expect(result).toBe(null);
		});
	});
	
	it("Remove Executed Requests for the given time",function(){
		var onLoadingStart = function(){return true},executeReqTime=currentDate.setMinutes(currentDate.getMinutes() + 10);;
		var fragmentModel = system.getObject("fragmentModel");
		requests = getRequest();		
		requests.action="complete";
		
		fragmentModel.addRequest(requests);		
		fragmentModel.setCallbacks(onLoadingStart,onLoadingStart,onLoadingStart,onLoadingStart);
		fragmentModel.executeCurrentRequest();
		fragmentController.removeExecutedRequestsBeforeTime(fragmentModel,executeReqTime);
		var res = fragmentModel.getLoadingTime();
		expect(res).toEqual(0);		
	}); 
	
	it("Get requests without attaching buffer",function(){
		debugger;
		var result = fragmentController.getLoadingRequests(bufferController);
		expect(result).toEqual(null);	
		result = fragmentController.getPendingRequests(bufferController);
		expect(result).toEqual(null);	
		result = fragmentController.getLoadingTime(bufferController);
		expect(result).toEqual(null);	
	});

	
	function GetBytes()
	{
		request = new XMLHttpRequest();
		request.open("GET", "http://dash.edgesuite.net/envivio/dashpr/clear/video1/Header.m4s", true);
		request.responseType = "arraybuffer";
		request.onreadystatechange = function () {	
			debugger;
			if(request.status == 200 && request.readyState == 4)
			{
				bytes = request.responseType;
			}					
		};
		request.send();
	}
	
	function CreateVideo()
	{
		element = document.createElement('video');
		$(element).autoplay = true;		
		video.setElement($(element)[0]);
	}
	
	function getRequest()
	{		
		var req = {};
		req.action="complete";
		req.quality = 1;
		req.streamType="video";
		req.type="Initialization Segment";
		req.url = "http://dash.edgesuite.net/envivio/dashpr/clear/video4/Header.m4s";
		req.startTime=currentDate.getTime();		
		firstByteDate=currentDate.setMinutes(currentDate.getMinutes() + 10);
		req.firstByteDate=firstByteDate;
		currentDate = new Date();
		endDate = currentDate.setMinutes(currentDate.getMinutes() + 20);
		req.requestEndDate=endDate;
		currentDate = new Date();
		req.duration=currentDate.setMinutes(currentDate.getMinutes() + 15);
		currentDate = new Date();
		return req;
	}
});