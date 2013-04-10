 describe("Manifest Extension Test Suite", function(){
 	var baseUrl, manExtn;
 	
 	beforeEach(function(){
 		baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
 		manExtn = new Dash.dependencies.DashManifestExtensions();
 	});
    
	it("getIsAudio_Null", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            period.children.push(adaptationSet); 
		expect(manExtn.getIsAudio(adaptationSet)).not.toBeNull();
 	});
	
	it("getIsAudio_NotNull", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            period.children.push(adaptationSet); 
		expect(manExtn.getIsAudio(adaptationSet)).not.toBeNull();
 	});
	
	it("getIsVideo_Null", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            
		expect(manExtn.getIsVideo(null)).toBeNull();
 	});
	
	it("getIsVideo_NotNull", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            
		expect(manExtn.getIsVideo(adaptationSet)).not.toBeNull();
 	});
	
	it("getIsMain_Null", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            
		expect(manExtn.getIsMain(null)).toBeNull();
 	});
	
	it("getIsMain_NotNull", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
		expect(manExtn.getIsMain(adaptationSet)).not.toBeNull();
 	});

	it("getRepresentationCount_Null", function(){ 
			adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;            
		expect(manExtn.getRepresentationCount(null)).toBeNull();
 	});
	
	it("getVideoData_Null", function(){ 
		var manifest = null;
		expect(manExtn.getVideoData(manifest)).toBeNull();
 	});
	
	it("getVideoData_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getVideoData(manifest)).not.toBeNull();
 	});
	
	it("getAudioDatas_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getAudioDatas(manifest)).not.toBeNull();
 	});
	
	it("getAudioDatas_Null", function(){ 
			var manifest=null;
		expect(manExtn.getAudioDatas(manifest)).toBeNull();
 	});
	
	it("getPrimaryAudioData_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getPrimaryAudioData(manifest)).not.toBeNull();
 	});
	
	it("getPrimaryAudioData_Null", function(){ 
			var manifest = null;
		expect(manExtn.getPrimaryAudioData(manifest)).toBeNull();
 	});
	
	it("getCodec_NotNull", function(){ 
	var data = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
						'<Period>' +
							'<AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" maxWidth="1280" maxHeight="720" maxFrameRate="25" par="16:9">' +
								'<SegmentTemplate presentationTimeOffset="0" timescale="90000" initialization="$RepresentationID$/Header.m4s" media="$RepresentationID$/$Number$.m4s" duration="360000" startNumber="0"/>' +
                                '<Representation id="video1" width="1280" height="720" frameRate="25" sar="1:1" scanType="progressive" bandwidth="3000000" codecs="avc1.4D4020"/>' +
                                '<Representation id="video2" width="1024" height="576" frameRate="25" sar="1:1" scanType="progressive" bandwidth="2000000" codecs="avc1.4D401F"/>' +
                                '<Representation id="video3" width="704" height="396" frameRate="25" sar="1:1" scanType="progressive" bandwidth="1000000" codecs="avc1.4D401E"/>' +
                                '<Representation id="video4" width="480" height="270" frameRate="25" sar="1:1" scanType="progressive" bandwidth="600000" codecs="avc1.4D4015"/>' +
                                '<Representation id="video5" width="320" height="180" frameRate="25" sar="1:1" scanType="progressive" bandwidth="349952" codecs="avc1.4D400D"/>' +
                        	'</AdaptationSet>' +
							'<AdaptationSet mimeType="audio/mp4" lang="en" segmentAlignment="true" startWithSAP="1">' +
                          		'<SegmentTemplate presentationTimeOffset="0" timescale="48000" initialization="$RepresentationID$/Header.m4s" media="$RepresentationID$/$Number$.m4s" duration="192000" startNumber="0"/>' +
                           		'<Representation id="audio" audioSamplingRate="48000" bandwidth="56000" codecs="mp4a.40.2">' +
                            		'<AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>' +
                        		'</Representation>' +
            				'</AdaptationSet>' +
    					'</Period>' +
					'</MPD>';
		expect(manExtn.getCodec(data)).toBeNull();
 	});
	
	it("getCodec_Null", function(){ 
	var data = null;
	expect(manExtn.getCodec(data)).toBeNull();
 	});
	
	it("getIsLive_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsLive(manifest)).not.toBeNull();
 	});
	
	it("getIsLive_Null", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsLive(manifest)).toBeNull();
 	});
	
	it("getIsDVR_Null", function(){ 
			var manifest = null;
		expect(manExtn.getIsDVR(manifest)).toBeNull();
 	});
	
	it("getIsLive_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsDVR(manifest)).not.toBeNull();
 	});
	
	it("getIsOnDemand_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsOnDemand(manifest)).not.toBeNull();
 	});
	
	it("getIsOnDemand_Null", function(){ 
			var manifest=null;
		expect(manExtn.getIsOnDemand(manifest)).toBeNull();
 	});
	
	it("getDuration_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getDuration(manifest)).not.toBeNull();
 	});
	
	it("getDuration_Null", function(){ 
			var manifest = null;
		expect(manExtn.getDuration(manifest)).toBeNull();
 	});
	
	});
	