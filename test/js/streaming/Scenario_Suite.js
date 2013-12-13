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
     describe("Scenario Suite", function () {				
                var bufferController,
                context,
                obj,
                element,
                url,
                stream,	
				element,
				video,
				objManifestLoader,
				periodIndex,
                manifestObj,source,streamController,manifestModel,
                system;
         
                beforeEach(function () {
					debugger;
					system = new dijon.System();
                    system.mapValue("system", system);
                    system.mapOutlet("system");
                    context = new Dash.di.DashContext();
                    system.injectInto(context);
					stream = system.getObject("stream");
					
					//added by uma
					player = new MediaPlayer(context);
					$("#version-number").text("version " + player.getVersion());

					player.startup();

					debug = player.debug;
					player.autoPlay = true;	

					var debug = player.getDebug(),
					isLive = false;

					player.attachSource(testUrl);
					debug.log("manifest = " + testUrl + " | isLive = " + isLive);
					playing = true;	
					
					element = document.createElement('video');
					$(element).autoplay = true;
					video = system.getObject("videoModel");
					video.setElement($(element)[0]);
					
					streamController = system.getObject('streamController');
					streamController.setVideoModel(video);
                });
				

        
          it("Pause",function(){		
			player.attachView(video);
			stream.setVideoModel(video);			
            stream.pause();
            expect($(element)[0].paused).toBe(true);
	    });
    
        it("Play without initialisation",function(){
            stream.play();
            expect($(element)[0].currentTime).toBe(0);
        });
		
        it("seek",function(){		
			streamController.load(testUrl);
			waits(1000);
			waitsFor(function(){
				if(streamController.getManifestExt() != undefined) return true;
			},"manifest is not loaded",100);
			runs(function(){
				bufferController = system.getObject("bufferController");
				streamController.play();
				expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
			});      
        });
          
        it("Play",function(){
			debugger;			
			streamController.load(testUrl);
			waits(1000);
			waitsFor(function(){
				if(streamController.getManifestExt() != undefined) return true;
			},"manifest is not loaded",100);
			runs(function(){
				debugger;
				bufferController = system.getObject("bufferController");
				streamController.play();
				expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
			});    
        });
         
        describe("Testcases based Static spec", function () {
            it("checking object data with start and endtime in  manifest", function () {
					debugger;
					streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestEndTime.mpd");
					waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
           
           it("checking object data with timeShiftBufferDepth in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestTimeShift.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
            it("checking object data without min buffer in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestNoMinBuffer.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
           
           it("checking object data with suggestedPresentationDelay  in  manifest", function () {
					debugger;
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestSugPresDelay.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
           
            it("checking object data without maxSegmentDuration  in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestNoMaxSegDuratn.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
           
            it("checking object data with maxSubsegmentDuration  in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestMaxSubsegDuration.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					}); 
           });
           
           it("checking object data with minimumUpdatePeriod   in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestWithMinUpdtPerd.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					});
           });
           
           it("checking object data without profile   in  manifest", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/static/ManifestWithoutProfile.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					});
           });
       });
       
	   
       describe("Testcases based Dynamic spec", function () {
          it("checking object data with only type parameter", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/BasicManifest.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					});
           });
           
           it("checking object data with type parameter as dynamic", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifest.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					});
           });
           
           it("checking object data without profiles attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithoutProfiles.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});		
					});
           });
           it("checking object data with id attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithId.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data without availabilityStartTime attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithoutStart.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data without duration attribute attribute (without mediaPresentationDuration and availabilityStartTime)", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithoutDur.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data with  availabilityStartTime and availabilityEndTime attribute  (without mediaPresentationDuration)", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithStart&End.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data with  availabilityStartTime,availabilityEndTime and mediaPresentationDuration attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithDur.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data with minimum update period attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithminUpdPeriod.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           it("checking object data with out minimum buffer attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithoutMinBuffer.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data with  suggestedPresentationDelay attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithSugstedManifest.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           
           it("checking object data with out maxSegmentDuration attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithoutMaximumDur.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});	
					});
           });
           it("checking object data with  maxSubsegmentDuration attribute", function () {
                    streamController.load("http://127.0.0.1:3000/hostedFiles/dynamic/DynamicManifestWithMaxSubDuration.mpd"); 
                    waits(1000);
					waitsFor(function(){
						if(streamController.getManifestExt() != undefined) return true;
					},"manifest is not loaded",100);
					runs(function(){
						debugger;
						bufferController = system.getObject("bufferController");
						streamController.play();
						waitsFor(function(){
							if (bufferController.metricsModel.getMetricsFor("video").PlayList[0] != undefined) return true;
						},"waiting for playlist",100);
						runs(function(){
							expect(bufferController.metricsModel.getMetricsFor("video").PlayList[0].mstart).toBe(0);	
						});
					});
           });
           
       });
       
	    /**	
       describe("Other", function () {
            it("checking object data with segmentAlignment false", function () {
				debugger;
				streamController.load("http://127.0.0.1:3000/hostedFiles/others/ManifestWithSegmentAlignment.mpd"); 
				waits(1000);
				waitsFor(function () {
					if(streamController.getManifestExt() != undefined)
					 return true;
					}, "data is null", 100);
				   runs(function () {
						debugger;
						bufferController = system.getObject('bufferController');
						stream.setVideoModel(video);
						stream.play();
						waitsFor(function () {
							if(stream.videoModel.getElement().error !=null)
							 return true;
						}, "data is null", 500);
						runs(function () {
							debugger;
							expect(stream.videoModel.getElement().error.code).toBe(4);
						});
				  }); 
           });
           
        });
        
		
		
        describe("Changes in  representation attribute", function () {
            it("checking object data with out id in representation", function () {
						debugger;
                      stream = createObject(system,"http://127.0.0.1:3000/hostedFiles/representation/RepWithoutId.mpd"); 
                       waits(1000);
                      waitsFor(function () {
                        if(stream.manifestModel.getValue()!=undefined)
                         return true;
                        }, "data is null", 100);
                       runs(function () {
                            bufferController = system.getObject('bufferController')
                            stream.play();
                            waitsFor(function () {
                                if(stream.videoModel.getElement().error!=null)
                                 return true;
                            }, "data is null", 500);
                            runs(function () {
								debugger;
                              expect(stream.videoModel.getElement().error.code).toBe(4);
                            });
                      });
           });
           it("checking object data with out bandwidth in representation", function () {
                      stream = createObject(system,"http://127.0.0.1:3000/hostedFiles/representation/RepwithOutbandwidth.mpd"); 
                       waits(1000);
                      waitsFor(function () {
                        if(stream.manifestModel.getValue()!=undefined)
                         return true;
                        }, "data is null", 100);
                       runs(function () {
                            bufferController = system.getObject('bufferController')
                            stream.play();
                            waitsFor(function () {
                                if(stream.videoModel.getElement().error!=null)
                                 return true;
                            }, "data is null", 500);
                            runs(function () {
                              expect(stream.videoModel.getElement().error.code).toBe(4);
                            });
                      });
            });
            
            it("checking object data with  qualityRanking in representation", function () {
                      stream = createObject(system,"http://127.0.0.1:3000/hostedFiles/representation/RepwithqualityRanking.mpd"); 
                       waits(1000);
                      waitsFor(function () {
                        if(stream.manifestModel.getValue()!=undefined)
                         return true;
                        }, "data is null", 100);
                       runs(function () {
                            bufferController = system.getObject('bufferController')
                            stream.play();
                            waitsFor(function () {
                                if(stream.videoModel.getElement().error!=null)
                                 return true;
                            }, "data is null", 500);
                            runs(function () {
                              expect(stream.videoModel.getElement().error.code).toBe(4);
                            });
                      });
            });
            
            it("checking object data with  dependencyId in representation", function () {
                      stream = createObject(system,"http://127.0.0.1:3000/hostedFiles/representation/RepwithDependencyId.mpd"); 
                       waits(1000);
                      waitsFor(function () {
                        if(stream.manifestModel.getValue()!=undefined)
                         return true;
                        }, "data is null", 100);
                       runs(function () {
                            bufferController = system.getObject('bufferController')
                            stream.play();
                            waitsFor(function () {
                                if(stream.videoModel.getElement().error!=null)
                                 return true;
                            }, "data is null", 500);
                            runs(function () {
                              expect(stream.videoModel.getElement().error.code).toBe(4);
                            });
                      });
            });
            
			
            it("checking object data with  mediaStreamStructureId in representation", function () {
                      stream = createObject(system,"http://127.0.0.1:3000/hostedFiles/representation/RepwithMediaStreamStructureId.mpd"); 
                       waits(1000);
                      waitsFor(function () {
                        if(stream.manifestModel.getValue()!=undefined)
                         return true;
                        }, "data is null", 100);
                       runs(function () {
                            bufferController = system.getObject('bufferController')
                            stream.play();
                            waitsFor(function () {
                                if(stream.videoModel.getElement().error!=null)
                                 return true;
                            }, "data is null", 500);
                            runs(function () {
                              expect(stream.videoModel.getElement().error.code).toBe(4);
                            });
                      });
            }); 
        }); */
        
       function createObject(system,otherSrce) {
			"use strict";
			stream = system.getObject("stream");
			stream.setVideoModel(video);
			stream.setPeriodIndex(0);
			periodIndex = stream.getPeriodIndex();
			objManifestLoader.load(otherSrce).when(function(data)
				{
					debugger;
					var manifest = data;				
					stream.load(manifest,periodIndex);	
					return stream;
				});
			return stream;       
       }
	   
	   function loadStreamController()
	   {
			
	   }
    });
 }