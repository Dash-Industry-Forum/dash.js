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


describe("Dash Handler Test Suite", function(){
    var baseUrl, system, context, indexHandler , data={},flag=false;
        beforeEach(function(){
            system = new dijon.System();
            baseUrl = testBaseUrl;
            system.mapValue("system", system);
            system.mapOutlet("system");


            context = new Dash.di.DashContext();
            system.injectInto(context);
            indexHandler = system.getObject("indexHandler");
            data.BaseURL=testBaseUrl;
            var objSegmentTemplate={};
            objSegmentTemplate.__cnt= 6;
            objSegmentTemplate.duration=360000;
            objSegmentTemplate.initialization="$RepresentationID$/Header.m4s";
            objSegmentTemplate.media="$RepresentationID$/$Number$.m4s";
            objSegmentTemplate.presentationTimeOffset=0;
            objSegmentTemplate.startNumber=0;
            objSegmentTemplate.timescale=90000;
            var objRepresentation=[];
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=349952;
            objSubRepresentation.codecs="avc1.4D400D";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=180;
            objSubRepresentation.id="video5";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  320;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=600000;
            objSubRepresentation.codecs= "avc1.4D4015";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height= 270;
            objSubRepresentation.id="video4";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  480;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=1000000;
            objSubRepresentation.codecs= "avc1.4D401E";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height= 396;
            objSubRepresentation.id="video3";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  704;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth= 2000000;
            objSubRepresentation.codecs= "avc1.4D401F";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=  576;
            objSubRepresentation.id="video2";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=   1024;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth= 3000000;
            objSubRepresentation.codecs= "avc1.4D4020";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=  720;
            objSubRepresentation.id="video1";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=   1280;
            objRepresentation.push(objSubRepresentation);
            data.Representation=objRepresentation;
            data.Representation_asArray=objRepresentation;
            data.SegmentTemplate=objSegmentTemplate;
            data.SegmentTemplate_asArray=objSegmentTemplate;
            data.__cnt= 20;
            data.__text= "";
            data.maxFrameRate=25;
            data.maxHeight= 720;
            data.maxWidth= 1280;
            data.mimeType= "video/mp4";
            data.par= "16:9";
            data.segmentAlignment= "true";
            data.startWithSAP= 1;

        });
         
      it("getInit function", function(){
			
                var promise = null,newData,
                  success,
                  successResult,
				  errorMsg,
                  failure; 
                  flag=false; 				 
				  
				 
					
				success = function(result) {
					
                   successResult = result;
                   flag = true;
                  },
                  failure = function(error) {
					
					errorMsg = error;
                   flag = false;
                  };
                 runs(function(){
					
				  newData = GenerateManifest();
                  promise =  indexHandler.getInitRequest(newData);
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
					
					if(flag == false) return true;						
                 },"waiting for flag value",100);
                 
                 runs(function(){
					
                     expect(errorMsg).not.toBeDefined();
                    });	
                
          });
          
         it("getSegmentRequestForTime function", function(){
			
                   var promise = null,
                  success,
				  errorMsg,
                  successResult,
                  failure; 
                  flag = false;
				  
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
				
					errorMsg = error;
                   flag = false;
                  };
                runs(function(){					
				  newData = GenerateManifest();
                  promise =  indexHandler.getSegmentRequestForTime(newData,4);
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){					
					if (flag == false) return true;
                 },"",100);
				 
                 runs(function(){					
                     expect(errorMsg).not.toBeDefined();
                    });
        });
        
       it("getNextSegmentRequest function", function(){
			
                      var promise = null,
                      success,
                      successResult,
					  errorMsg,
                      failure;
                      flag=false;
			
			
				success = function(result) {
                               successResult = result;
                               flag = true;
                              },
                              failure = function(error) {
                               flag = false;
                              };             
						Segsuccess = function(result) {
								
                              promise =  indexHandler.getNextSegmentRequest(data);
                              promise.then(success, failure);
                              },
                              Segfailure = function(error) {
                               flag = false;
                              };
                             runs(function(){
								
								newData = GenerateManifest();
								promise =  indexHandler.getSegmentRequestForTime(newData,0);
								promise.then(Segsuccess, Segfailure);
                             });
                             
                             waitsFor(function(){
                              if (flag == false) return true;
                             },"",100);
                             runs(function(){
									
                                 expect(errorMsg).not.toBeDefined();
                             });

                      
            
        });
        
         it("getNextSegmentRequest function without initialising", function(){
				
                expect(function() {indexHandler.getNextSegmentRequest(data,0)}).toThrow(); //Without initialising hence index will be -1
                          
           });
        
           /* it("getInit function with url and one set of representation as empty", function(){
                 data.BaseURL=""
                 data.Representation_asArray[0]=""
                 expect(function() {indexHandler.getInitRequest(0,data)}).toThrow(); //If representation array and base url  don't have data it will get an error in line 108 

                
          }); */
          
          it("getInit function  one set of representation as empty", function(){
				;
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=testBaseUrl;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth=349952;
                objSubRepresentation.codecs="avc1.4D400D";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height=180;
                objSubRepresentation.id="video5";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=  320;
                data.Representation_asArray[0]=objSubRepresentation;
                
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false; 
                 success = function(result) {
                   expect(result).toEqual(null);
                   flag = true;
                  },
                  failure = function(error) {
                   flag = false;
                  };
                 runs(function(){
				;
                  promise =  indexHandler.getInitRequest(0,data);
                  promise.then(success, failure);
                 });
                 
                 
          });
          it("getInit function  one set of representation as empty but it contains SegmentList", function(){
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=testBaseUrl;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth=349952;
                objSubRepresentation.codecs="avc1.4D400D";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height=180;
                objSubRepresentation.id="video5";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=  320;
                data.Representation_asArray[0]=objSubRepresentation;
                
                var objSegmentList={};
                objSegmentList.sourceURL=360000;
                objSegmentList.initialization="$RepresentationID$/Header.m4s";
                data.Representation_asArray[0].SegmentList=objSegmentList;
                
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false; 
                success = function(result) {
                   expect(result).toEqual(null);
                   flag = true;
                  },
                  failure = function(error) {
                   flag = false;
                  };
                 runs(function(){
                  promise =  indexHandler.getInitRequest(0,data);
                  promise.then(success, failure);
                 });

                
          });
        
          it("getSegmentRequestForTime function with time is null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(null,4,data); 
                  promise.then(success, failure);
                  expect(successResult).toEqual(undefined);
                 });
         });
          
      it("All get and set functions", function(){
            indexHandler.setType("audio");
            //indexHandler.setIsLive(true);
            //indexHandler.setDuration(4);
            expect(indexHandler.getType()).toEqual("audio");
            //expect(indexHandler.getIsLive()).toEqual(true);
            //expect(indexHandler.getDuration()).toEqual(4);
         });
 if(window.location.href.indexOf("runner.html")==0)
 {
    describe("Dash Handler Negative Test Suite", function(){
        //Negative test cases
        it("getInit function with quality as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                flag=false; 
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                  failure = function(error) {
                    flag = false;
                  };
                 runs(function(){
                  promise =  indexHandler.getInitRequest(data); //Checking whether data is null or not  but not checking quality getRepresentationForQuality                  representation  is getting 'undefined' and failing in line 76 of  getInit
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 
                 runs(function(){
                    expect(successResult).toBeNull();
                });
          });
          
           it("getInit function with data as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                flag=false; 
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                  failure = function(error) {
                    flag = false;
                  };
                 runs(function(){
                  promise =  indexHandler.getInitRequest(0,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality                  representation  is getting 'null' and failing in line 76 of  getInit
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 
                 runs(function(){
                    expect(successResult).toEqual(null);
                });
          });
          
          it("getInit function with data and quality as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                flag=false; 
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                  failure = function(error) {
                    flag = false;
                  };
                 runs(function(){
                  promise =  indexHandler.getInitRequest(null,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality                  representation  is getting 'null' and failing in linee 76 of  getInit
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 
                 runs(function(){
                    expect(successResult).toEqual(null);
                });
          });
          
          it("getSegmentRequestForTime function with data as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(78.14281463623047,4,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'null' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                      expect(successResult).toEqual(null);
                    });
         });
         
          it("getSegmentRequestForTime function with data and quality as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(78.14281463623047,null,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'null' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                      expect(successResult).toEqual(null);
                    });
         });
         
          it("getSegmentRequestForTime function with quality as null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(78.14281463623047,null,data); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'undefined' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                      expect(successResult).toEqual(null);
                    });
         });
         
         
         it("getSegmentRequestForTime function with time and quality is null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(null,null,data); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'undefined' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                     expect(successResult).toEqual(null);
                    });
         });
         
         it("getSegmentRequestForTime function with time quality, and data are null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(null,null,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'null' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                     expect(successResult).toEqual(null);
                    });
         });
         
          it("getSegmentRequestForTime function with time and data is null", function(){
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false;
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  indexHandler.getSegmentRequestForTime(null,4,null); //Checking whether data is null or not  but not checking quality getRepresentationForQuality  representation  is getting 'null' and failing in line 263 of  getSegments 
                  promise.then(success, failure);
                 });
                 
                 waitsFor(function(){
                  return flag;
                 });
                 runs(function(){
                     expect(successResult).toEqual(null);
                    });
         });
         
          
       }); 
   }
   
   
   function GenerateManifest(){
		;
			var data = {};
			data.BaseURL=testBaseUrl;
            var objSegmentTemplate={};
            objSegmentTemplate.__cnt= 6;
            objSegmentTemplate.duration=360000;
            objSegmentTemplate.initialization="$RepresentationID$/Header.m4s";
            objSegmentTemplate.media="$RepresentationID$/$Number$.m4s";
            objSegmentTemplate.presentationTimeOffset=0;
            objSegmentTemplate.startNumber=0;
            objSegmentTemplate.timescale=90000;
            var objRepresentation=[];
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=349952;
            objSubRepresentation.codecs="avc1.4D400D";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=180;
            objSubRepresentation.id="video5";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  320;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=600000;
            objSubRepresentation.codecs= "avc1.4D4015";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height= 270;
            objSubRepresentation.id="video4";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  480;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth=1000000;
            objSubRepresentation.codecs= "avc1.4D401E";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height= 396;
            objSubRepresentation.id="video3";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=  704;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth= 2000000;
            objSubRepresentation.codecs= "avc1.4D401F";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=  576;
            objSubRepresentation.id="video2";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=   1024;
            objRepresentation.push(objSubRepresentation);
            var objSubRepresentation=[];
            objSubRepresentation.BaseURL=testBaseUrl;
            objSubRepresentation.SegmentTemplate=objSegmentTemplate;
            objSubRepresentation.__cnt=8;
            objSubRepresentation.bandwidth= 3000000;
            objSubRepresentation.codecs= "avc1.4D4020";
            objSubRepresentation.frameRate=25;
            objSubRepresentation.height=  720;
            objSubRepresentation.id="video1";
            objSubRepresentation.mimeType="video/mp4";
            objSubRepresentation.sar="1:1";
            objSubRepresentation.scanType= "progressive";
            objSubRepresentation.width=   1280;
            objRepresentation.push(objSubRepresentation);		

		
			var objAdap2 = {};
			var objAdap2Array = [];
			objAdap2.Representation=objRepresentation;
			objAdap2.Representation_asArray = objRepresentation;
			objAdap2Array.push(objAdap2);			
			
			
			var objAdapMain={};
			objAdapMain.segmentAlignment="true";
			objAdapMain.maxWidth="1920";
			objAdapMain.maxHeight="1080";
			objAdapMain.maxFrameRate="25";
			objAdapMain.par="16:9";
			objAdapMain.AdaptationSet = objAdap2Array;
			objAdapMain.AdaptationSet_asArray = objAdap2Array;
			
			
			var objPeriodSub={};
			var objPeriodArray=[];
			objPeriodArray.push(objAdapMain);
			objPeriodSub.Period=objPeriodArray;
			objPeriodSub.Period_asArray = objPeriodArray;	
		
			var objManifest = {};
			var objAdap = {};
			var objPeriod ={};
			var objMPD = {};
			
			objMPD.manifest = objPeriodSub;
			objMPD.manifest_asArray = objPeriodSub;		
			objPeriod.index=0;
			objPeriod.mpd = objMPD;
			objPeriod.mpd_asArray = objPeriodSub;
			objAdap.index=0;
			objAdap.period = objPeriod;
			objAdap.period_asArray = objPeriod;
			objManifest.index=0;
			objManifest.adaptation = objAdap;
			objManifest.adaptation_AsArray = objAdap;
			
			return objManifest;
		
   }
});