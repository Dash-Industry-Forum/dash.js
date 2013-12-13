if(window.location.href.indexOf("runner.html")>0)
{
	describe("Context Suite", function () {
            var context,
                system,
                obj,
				result;
		beforeEach(function(){
			system = new dijon.System();
			system.mapValue("system", system);
			system.mapOutlet("system");
			context = new Dash.di.DashContext();
			system.injectInto(context);
		});
		
		it("Creating Singleton Objects",function(){
			runs(function(){
				expect(system.getObject('debug')).not.toBe(null);
				expect(system.getObject('eventBus')).not.toBe(null);
				expect(system.getObject('capabilities')).not.toBe(null);
				expect(system.getObject('textTrackExtensions')).not.toBe(null);
				expect(system.getObject('vttParser')).not.toBe(null);
				expect(system.getObject('manifestModel')).not.toBe(null);
				expect(system.getObject('metricsModel')).not.toBe(null);				
				expect(system.getObject('textVTTSourceBuffer')).not.toBe(null);
				expect(system.getObject('mediaSourceExt')).not.toBe(null);
				expect(system.getObject('sourceBufferExt')).not.toBe(null);
				expect(system.getObject('bufferExt')).not.toBe(null);
				expect(system.getObject('abrController')).not.toBe(null);
				expect(system.getObject('errHandler')).not.toBe(null);
				expect(system.getObject('protectionExt')).not.toBe(null);
			});
		});
		
		it("Creating Singleton Objects",function(){
			runs(function(){
				expect(system.getObject('protectionModel')).not.toBe(null);
				expect(system.getObject('videoModel')).not.toBe(null);
				expect(system.getObject('protectionController')).not.toBe(null);
				expect(system.getObject('metrics')).not.toBe(null);
				expect(system.getObject('downloadRatioRule')).not.toBe(null);
				expect(system.getObject('insufficientBufferRule')).not.toBe(null);
				expect(system.getObject('limitSwitchesRule')).not.toBe(null);
				expect(system.getObject('abrRulesCollection')).not.toBe(null);
				expect(system.getObject('textController')).not.toBe(null);
				expect(system.getObject('bufferController')).not.toBe(null);
				expect(system.getObject('manifestLoader')).not.toBe(null);
				expect(system.getObject('manifestUpdater')).not.toBe(null);
				expect(system.getObject('fragmentLoader')).not.toBe(null);
				expect(system.getObject('fragmentController')).not.toBe(null);
				expect(system.getObject('streamController')).not.toBe(null);
				expect(system.getObject('stream')).not.toBe(null);				
			});
		});
		

	});
}