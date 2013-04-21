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

 describe("DashMetricsExtensions Test Suite", function(){
    var baseUrl, system, metricExtn;
    
    beforeEach(function(){
        baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
        
        // Set up DI.
        system = new dijon.System();
        system.mapValue("system", system);
        system.mapOutlet("system");

        context = new Dash.di.DashContext();
        system.injectInto(context);

        metricExtn = system.getObject("metricsExt");
    });
    
    it("getBandwidthForRepresentation is a function", function(){
    
        var result = (typeof metricExtn.getBandwidthForRepresentation);
        expect(result).toEqual('function');
    });
        
    it("getIndexForRepresentation is a function", function(){
    
        var result = (typeof metricExtn.getIndexForRepresentation);
        expect(result).toEqual('function');
    });
    
    
    it("getMaxIndexForBufferType is a function", function(){
    
        var result = (typeof metricExtn.getMaxIndexForBufferType);
        expect(result).toEqual('function');
    });
    
    
    it("getCurrentRepresentationSwitch is a function", function(){
    
        var result = (typeof metricExtn.getCurrentRepresentationSwitch);
        expect(result).toEqual('function');
    }); 
        
    it("getCurrentBufferLevel is a function", function(){
    
        var result = (typeof metricExtn.getCurrentBufferLevel);
        expect(result).toEqual('function');
    });
    
    it("getCurrentHttpRequest is a function", function(){
    
        var result = (typeof metricExtn.getCurrentHttpRequest);
        expect(result).toEqual('function');
    });
    
    it("getCurrentDroppedFrames is a function", function(){
    
        var result = (typeof metricExtn.getCurrentDroppedFrames);
        expect(result).toEqual('function');
    });
        
 });