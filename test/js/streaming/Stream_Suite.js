if(window.location.href.indexOf("runner.html")>0){
describe("Stream test Suite", function () {
	var ManifestLoader,metricsModel,parser,manifestExt,debug,player,videoDataObj,videotag,codec,mediaSource,primaryAudioDataObj,url,server,streams,periodInfo={};

	beforeEach(function () {
		system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");
		context = new Dash.di.DashContext();
		system.injectInto(context);	
		player = initMediaPlayer();
        ManifestLoader = system.getObject('manifestLoader');
		streams = system.getObject("stream");
		
		//streams.setPeriodIndex(0);
		//periodIndex = streams.getPeriodIndex();
      
        manifestObj = null;
        manifestExt =  system.getObject("manifestExt");
		periodInfo.id =0;
		periodInfo.index=0;
		periodInfo.duration = 0;
	});
	
    
	it("Prerequisites for Main Function Initilaised",function(){
		debugger;
		var browserVersion = parseBrowserVersion( location.search );	
		//expect(browserVersion.toLowerCase()).toContain("stable");
	}); 
	
	it("ManifestObj Initilaised",function(){
		expect(manifestRes.Period.BaseURL).toEqual(testBaseUrl);			
	});
	
	it("Audio-Data Initilaised",function(){
		debugger;
		manifestExt.getAudioDatas(manifestRes,periodInfo.index).then(function (audioDatas) {
			debugger;
			expect(audioDatas[0].mimeType).toContain('audio');
		});
		
	}); 
	
	it("Audio-Track Index Set",function(){
		debugger;
		manifestExt.getPrimaryAudioData(manifestRes,periodInfo.index).then( function (primaryAudioData) {
			primaryAudioDataObj = primaryAudioData;
			manifestExt.getDataIndex(primaryAudioDataObj,manifestRes).then(
				function (index) {
					expect(isNaN(index)).not.toBeTruthy();
			}); 
		});      
	}); 
		
	it("Audio-Codec Initilaised",function(){
		debugger;
		waitsFor(function(){
			if (manifestRes != undefined) return true;
		},"waiting for manifest",100);
		runs(function(){
			debugger;
			manifestExt.getPrimaryAudioData(manifestRes,periodInfo.index).then(function (primaryAudioData) {
			debugger;
			canRunBool = '';
			manifestExt.getCodec(primaryAudioData).then(
				function (codec) {
					debugger;
				   expect(codec).toContain('audio');
				});
			});
		});		 
	});
	
	
	/** Commented as getLiveStart is removed in Dash Manifest Extensions
	it("Check Live Start",function(){
		if(manifestRes != undefined)
		{
			manifestExt.getLiveStart(manifestRes, periodInfo).then(function (dataLiveStart) {
				debugger;
				expect(isNaN(dataLiveStart)).not.toBeTruthy();
			});       
		}
	});**/	
	
	it("Duration initilaised",function(){
		manifestExt.getDuration(manifestRes, false).then(function (duration) {
			expect(isNaN(duration)).not.toBeTruthy();
		});      
	});
	
	it("Check Stream Duration",function(){	
		debugger;
		streams = initStreamData(manifestRes);
		waits(1000);
		waitsFor(function(){
			if(streams.getDuration() != undefined) return true;
		}, "stream is not initialized", 100);
		runs(function () {
			debugger;
			var duration = streams.getDuration();
			expect(isNaN(duration)).not.toBeTruthy();
		});				          
	});	

	it("Check Auto-Play",function(){
		debugger;		
		streams = initStreamData(manifestRes);
		waitsFor(function(){
			if(streams.getAutoPlay() != undefined) 
				return true;
		}, "stream is not initialized", 100);
		runs(function () {
			var autoPlay = streams.getAutoPlay();
			expect(autoPlay).not.toBe(null);
			expect(autoPlay).toBeTruthy();
		});		          
	});	

	
	
	function parseBrowserVersion( searchStr ) {
		var versionIndex,
			subSearchStr,
			ampIndex,
			equalIndex,
			result;

		if ( searchStr === null || searchStr.length === 0) {
			return "stable";
		}

		searchStr = searchStr.toLowerCase();
		versionIndex = searchStr.indexOf("version=");

		if (versionIndex === -1) {
			return "stable"
		}

		subSearchStr = searchStr.substr( versionIndex, searchStr.length );
		ampIndex = subSearchStr.indexOf("&");
		equalIndex = subSearchStr.indexOf("=");

		if (ampIndex === -1) {
			result = subSearchStr.substr((equalIndex + 1), subSearchStr.length);
		} else {
			result = subSearchStr.substr((equalIndex + 1), (ampIndex - equalIndex - 1));
		}

		return result;
	}
	
	function initStreamData(manifestObj)
	{		
		debugger;
		var element,video;
		if (manifestObj != undefined)
		{		
			element = document.createElement('video');
			(element).autoplay = true;
			video = system.getObject("videoModel");
			video.setElement((element));
			streams.setVideoModel(video);
			streams.load(manifestObj,periodInfo);	
			return streams;
		}
		return streams;		
	}
	
	function initMediaPlayer()
	{
		player = new MediaPlayer(context);
		//$("#version-number").text("version " + player.getVersion());
		player.startup();

		debug = player.debug;
		//debug.init(console);

		player.autoPlay = true;	
		//var input = $("#custom-source"),
		//liveBox = $("#live-checkbox"),
		
		var input,
		liveBox,
		debug = player.getDebug(),
		url,
		isLive = false;

		url = "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd ";
		isLive = true;

		//player.setIsLive(isLive);
		player.attachSource(url);
		debug.log("manifest = " + url + " | isLive = " + isLive);
		playing = true;
		return player;
	}

	
	 describe("Stream test Suite for Events", function () {
        var tape,result,stream,video,startFlg,seekFlag,timeout;
        beforeEach(function(){
            startFlg = false;
            video = system.getObject("videoModel");

            element = document.createElement('video');
             video.setElement((element));

            stream = system.getObject("stream");
            spyOn(video, 'play').andCallThrough();
            spyOn(video, 'pause').andCallThrough();
            //stream.setPeriodIndex(period);
            stream.load(url,periodInfo);

            setTimeout(function(){
                startFlg = true;
            },100);
        });

    });
});

}


