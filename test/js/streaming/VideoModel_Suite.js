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
    describe("Video Model Suite", function () {
            var context,
                system,
                result,
                element,
                objGruntUtil,
                isGrunt,
                videoModel;
               
                 beforeEach(function () {
                    system = new dijon.System();
                    system.mapValue("system", system);
                    system.mapOutlet("system");
                    context = new Dash.di.DashContext();
                    system.injectInto(context);
                    
                    
                    videoModel=system.getObject('videoModel');  
                    element = document.createElement('video');
                    videoModel.setElement((element));
                   
                 });
                 
                 it("stallStream for adding", function(){
                         videoModel.stallStream("video",true);
                         result= videoModel.getPlaybackRate();
                         expect(result).toBe(0);
                 });
                 
                 
                 
                 it("stallStream for removing ", function(){
                         videoModel.stallStream("video",false);
                         result=videoModel.getPlaybackRate();
                         expect(result).toBe(1);
                 });
                 
                 it("isStalled by adding", function(){
                         videoModel.stallStream("video",true);
                         result=videoModel.isStalled();
                         expect(result).toBe(true);
                 });
                 
                 it("isStalled by adding and removing", function(){
                         videoModel.stallStream("video",true);
                         result=videoModel.isStalled();
                         expect(result).toBe(true);
                         
                         videoModel.stallStream("video",false);
                         result=videoModel.isStalled();
                         expect(result).toBe(false);
                 });
                 
                 it("stallStream for adding by giving type null", function(){
                         videoModel.stallStream(null,true);
                         videoModel.setPlaybackRate(5);
                         result= videoModel.getPlaybackRate();
                         expect(result).toBe(5);
                 });
                 
                  it("isStalled by adding and removing by giving type null", function(){
                         videoModel.stallStream("video",true);
                         result=videoModel.isStalled();
                         expect(result).toBe(true);
                         
                         videoModel.stallStream(null,false);
                         result=videoModel.isStalled();
                         expect(result).toBe(true);
                 });
                 
                 it("isPaused", function(){
                     expect(videoModel.isPaused()).not.toBe(null);
                 });
                 
                 it("getDroppedFrames", function(){
                     videoModelExtension=new MediaPlayer.dependencies.VideoModelExtensions();
                     expect(videoModelExtension.getDroppedFrames((element))).not.toBe(null);
                 });
            });
            
    }