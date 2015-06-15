/* 
 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
 * License: BSD-3-Clause (see LICENSE file)
 */
var BoxParser = {
	ERR_NOT_ENOUGH_DATA : 0,
	OK : 1,
	boxCodes : [ 
				 "mdat", 
				 "avcC", "hvcC", "ftyp", "styp", 
				 "payl", "vttC",
				 "vmhd", "smhd", "hmhd", // full boxes not yet parsed
				 "idat", "meco"
			   ],
	fullBoxCodes : [ "mvhd", "tkhd", "mdhd", "hdlr", "smhd", "hmhd", "nhmd", "url ", "urn ", 
				  "ctts", "cslg", "stco", "co64", "stsc", "stss", "stsz", "stz2", "stts", "stsh", 
				  "mehd", "trex", "mfhd", "tfhd", "trun", "tfdt",
				  "esds", "subs",
				  "txtC",
				  "sidx", "emsg", "prft", "pssh",
				  "elst", "dref", "url ", "urn ",
				  "sbgp", "sgpd",
				  "meta", "xml ", "bxml", "iloc", "pitm", "ipro", "iinf", "infe", "iref" , "mere",
				  /* missing "stsd": special case full box and container */
				],
	containerBoxCodes : [ 
		[ "moov", [ "trak" ] ],
		[ "trak" ],
		[ "edts" ],
		[ "mdia" ],
		[ "minf" ],
		[ "dinf" ],
		[ "stbl" ],
		[ "mvex", [ "trex" ] ],
		[ "moof", [ "traf" ] ],
		[ "traf", [ "trun" ] ],
		[ "vttc" ], 
		[ "tref" ]
	],
	sampleEntryCodes : [ 
		/* 4CC as registered on http://mp4ra.org/codecs.html */
		{ prefix: "Visual", types: [ "mp4v", "avc1", "avc2", "avc3", "avc4", "avcp", "drac", "encv", "mjp2", "mvc1", "mvc2", "resv", "s263", "svc1", "vc-1", "hvc1", "hev1"  ] },
		{ prefix: "Audio", 	types: [ "mp4a", "ac-3", "alac", "dra1", "dtsc", "dtse", ,"dtsh", "dtsl", "ec-3", "enca", "g719", "g726", "m4ae", "mlpa",  "raw ", "samr", "sawb", "sawp", "sevc", "sqcp", "ssmv", "twos" ] },
		{ prefix: "Hint", 	types: [ "fdp ", "m2ts", "pm2t", "prtp", "rm2t", "rrtp", "rsrp", "rtp ", "sm2t", "srtp" ] },
		{ prefix: "Metadata", types: [ "metx", "mett", "urim" ] },
		{ prefix: "Subtitle", types: [ "stpp", "wvtt", "sbtt", "tx3g", "stxt" ] }
	],
	trackReferenceTypes: [
		"scal"
	],
	initialize: function() {
		var i, j;
		var length;
		BoxParser.FullBox.prototype = new BoxParser.Box();
		BoxParser.ContainerBox.prototype = new BoxParser.Box();
		BoxParser.stsdBox.prototype = new BoxParser.FullBox();
		BoxParser.SampleEntry.prototype = new BoxParser.FullBox();
		BoxParser.TrackReferenceTypeBox.prototype = new BoxParser.Box();
		/* creating constructors for simple boxes */
		length = BoxParser.boxCodes.length;
		for (i=0; i<length; i++) {
			BoxParser[BoxParser.boxCodes[i]+"Box"] = (function (j) { /* creating a closure around the iterating value of i */
				return function(size) {
					BoxParser.Box.call(this, BoxParser.boxCodes[j], size);
				}
			})(i);
			BoxParser[BoxParser.boxCodes[i]+"Box"].prototype = new BoxParser.Box();
		}
		/* creating constructors for full boxes */
		length = BoxParser.fullBoxCodes.length;
		for (i=0; i<length; i++) {
			BoxParser[BoxParser.fullBoxCodes[i]+"Box"] = (function (j) { 
				return function(size) {
					BoxParser.FullBox.call(this, BoxParser.fullBoxCodes[j], size);
				}
			})(i);
			BoxParser[BoxParser.fullBoxCodes[i]+"Box"].prototype = new BoxParser.FullBox();
		}
		/* creating constructors for container boxes */
		length = BoxParser.containerBoxCodes.length;
		for (i=0; i<length; i++) {
			BoxParser[BoxParser.containerBoxCodes[i][0]+"Box"] = (function (j, subBoxNames) { 
				return function(size) {
					BoxParser.ContainerBox.call(this, BoxParser.containerBoxCodes[j][0], size);
					if (subBoxNames) {
						this.subBoxNames = subBoxNames;
						var nbSubBoxes = subBoxNames.length;
						for (var k = 0; k<nbSubBoxes; k++) {
							this[subBoxNames[k]+"s"] = [];
						}
					}
				}
			})(i, BoxParser.containerBoxCodes[i][1]);
			BoxParser[BoxParser.containerBoxCodes[i][0]+"Box"].prototype = new BoxParser.ContainerBox();
		}
		/* creating constructors for stsd entries  */
		length = BoxParser.sampleEntryCodes.length;
		for (j = 0; j < length; j++) {
			var prefix = BoxParser.sampleEntryCodes[j].prefix;
			var types = BoxParser.sampleEntryCodes[j].types;
			var nb_types = types.length;
			BoxParser[prefix+"SampleEntry"] = function(type, size) { BoxParser.SampleEntry.call(this, type, size); };
			BoxParser[prefix+"SampleEntry"].prototype = new BoxParser.SampleEntry();
			for (i=0; i<nb_types; i++) {
				BoxParser[types[i]+"Box"] = (function (k, l) { 
					return function(size) {
						BoxParser[BoxParser.sampleEntryCodes[k].prefix+"SampleEntry"].call(this, BoxParser.sampleEntryCodes[k].types[l], size);
					}
				})(j, i);
				BoxParser[types[i]+"Box"].prototype = new BoxParser[prefix+"SampleEntry"]();
			}
		}
		/* creating constructors for track reference type boxes */
		length = BoxParser.trackReferenceTypes.length;
		for (i=0; i<length; i++) {
			BoxParser[BoxParser.trackReferenceTypes[i]+"Box"] = (function (j) { 
				return function(size) {
					BoxParser.TrackReferenceTypeBox.call(this, BoxParser.trackReferenceTypes[j], size);
				}
			})(i);
			BoxParser[BoxParser.trackReferenceTypes[i]+"Box"].prototype = new BoxParser.Box();
		}
	},
	Box: function(_type, _size) {
		this.type = _type;
		this.size = _size;
	},
	FullBox: function(type, size) {
		BoxParser.Box.call(this, type, size);
		this.flags = 0;
		this.version = 0;
	},
	ContainerBox: function(type, size) {
		BoxParser.Box.call(this, type, size);
		this.boxes = [];
	},
	SampleEntry: function(type, size) {
		BoxParser.Box.call(this, type, size);	
		this.boxes = [];
	},
	TrackReferenceTypeBox: function(type, size) {
		BoxParser.Box.call(this, type, size);	
		this.track_ids = [];
	},
	stsdBox: function(size) {
		BoxParser.FullBox.call(this, "stsd", size);
		this.entries = [];
	},
	parseOneBox: function(stream, isSampleEntry) {
		var box;
		var start = stream.position;
		var hdr_size = 0;
		if (stream.byteLength - stream.position < 8) {
			Log.d("BoxParser", "Not enough data in stream to parse the type and size of the box");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
		}
		var size = stream.readUint32();
		var type = stream.readString(4);
		Log.d("BoxParser", "Found box of type "+type+" and size "+size+" at position "+start+" in the current buffer ("+(stream.buffer.fileStart+start)+" in the file)");
		hdr_size = 8;
		if (type == "uuid") {
			uuid = stream.readString(16);
			hdr_size += 16;
		}
		if (size == 1) {
			if (stream.byteLength - stream.position < 8) {
				stream.seek(start);
				Log.w("BoxParser", "Not enough data in stream to parse the extended size of the \""+type+"\" box");
				return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
			}
			size = stream.readUint64();
			hdr_size += 8;
		} else if (size === 0) {
			/* box extends till the end of file */
			throw "Unlimited box size not supported";
		}
		
		if (start + size > stream.byteLength ) {
			stream.seek(start);
			Log.w("BoxParser", "Not enough data in stream to parse the entire \""+type+"\" box");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA, type: type, size: size, hdr_size: hdr_size };
		}
		if (BoxParser[type+"Box"]) {
			box = new BoxParser[type+"Box"](size - hdr_size);		
		} else {
			if (isSampleEntry) {
				box = new BoxParser.SampleEntry(type, size - hdr_size);
			} else {
				box = new BoxParser.Box(type, size - hdr_size);
			}
		}
		/* recording the position of the box in the input stream */
		box.hdr_size = hdr_size;
		box.start = start;
		box.fileStart = start + stream.buffer.fileStart;
		box.parse(stream);
		return { code: BoxParser.OK, box: box, size: size };
	},
}

BoxParser.initialize();

BoxParser.TKHD_FLAG_ENABLED    = 0x000001;
BoxParser.TKHD_FLAG_IN_MOVIE   = 0x000002;
BoxParser.TKHD_FLAG_IN_PREVIEW = 0x000004;

BoxParser.TFHD_FLAG_BASE_DATA_OFFSET	= 0x01;
BoxParser.TFHD_FLAG_SAMPLE_DESC			= 0x02;
BoxParser.TFHD_FLAG_SAMPLE_DUR			= 0x08;
BoxParser.TFHD_FLAG_SAMPLE_SIZE			= 0x10;
BoxParser.TFHD_FLAG_SAMPLE_FLAGS		= 0x20;
BoxParser.TFHD_FLAG_DUR_EMPTY			= 0x10000;
BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF= 0x20000;

BoxParser.TRUN_FLAGS_DATA_OFFSET= 0x01;
BoxParser.TRUN_FLAGS_FIRST_FLAG	= 0x04;
BoxParser.TRUN_FLAGS_DURATION	= 0x100;
BoxParser.TRUN_FLAGS_SIZE		= 0x200;
BoxParser.TRUN_FLAGS_FLAGS		= 0x400;
BoxParser.TRUN_FLAGS_CTS_OFFSET	= 0x800;


BoxParser.SampleEntry.prototype.isVideo = function() {
	return false;
}

BoxParser.SampleEntry.prototype.isAudio = function() {
	return false;
}

BoxParser.SampleEntry.prototype.isSubtitle = function() {
	return false;
}

BoxParser.SampleEntry.prototype.isMetadata = function() {
	return false;
}

BoxParser.SampleEntry.prototype.isHint = function() {
	return false;
}

BoxParser.SampleEntry.prototype.getCodec = function() {
	return this.type;
}

BoxParser.SampleEntry.prototype.getWidth = function() {
	return "";
}

BoxParser.SampleEntry.prototype.getHeight = function() {
	return "";
}

BoxParser.SampleEntry.prototype.getChannelCount = function() {
	return "";
}

BoxParser.SampleEntry.prototype.getSampleRate = function() {
	return "";
}

BoxParser.SampleEntry.prototype.getSampleSize = function() {
	return "";
}

BoxParser.VisualSampleEntry.prototype.isVideo = function() {
	return true;
}

BoxParser.VisualSampleEntry.prototype.getWidth = function() {
	return this.width;
}

BoxParser.VisualSampleEntry.prototype.getHeight = function() {
	return this.height;
}

BoxParser.AudioSampleEntry.prototype.isAudio = function() {
	return true;
}

BoxParser.AudioSampleEntry.prototype.getChannelCount = function() {
	return this.channel_count;
}

BoxParser.AudioSampleEntry.prototype.getSampleRate = function() {
	return this.samplerate;
}

BoxParser.AudioSampleEntry.prototype.getSampleSize = function() {
	return this.samplesize;
}

BoxParser.SubtitleSampleEntry.prototype.isSubtitle = function() {
	return true;
}

BoxParser.MetadataSampleEntry.prototype.isMetadata = function() {
	return true;
}


BoxParser.decimalToHex = function(d, padding) {
	var hex = Number(d).toString(16);
	padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
	while (hex.length < padding) {
		hex = "0" + hex;
	}
	return hex;
}

BoxParser.avc1Box.prototype.getCodec = function() {
	var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.avcC) {
		return baseCodec+"."+BoxParser.decimalToHex(this.avcC.AVCProfileIndication)+
						  ""+BoxParser.decimalToHex(this.avcC.profile_compatibility)+
						  ""+BoxParser.decimalToHex(this.avcC.AVCLevelIndication);		
	} else {
		return baseCodec;
	}
}

BoxParser.hvc1Box.prototype.getCodec = function() {
	var i;
	var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.hvcC) {
		baseCodec += '.';
		switch (this.hvcC.general_profile_space) {
			case 0: 
				baseCodec += '';
				break;
			case 1: 
				baseCodec += 'A';
				break;
			case 2: 
				baseCodec += 'B';
				break;
			case 3: 
				baseCodec += 'C';
				break;
		
		}
		baseCodec += this.hvcC.general_profile_idc;
		baseCodec += '.';
		var val = this.hvcC.general_profile_compatibility;
		var reversed = 0;
		for (i=0; i<32; i++) {
			reversed |= val & 1;
			if (i==31) break;
			reversed <<= 1;
			val >>=1;
		}				
		baseCodec += BoxParser.decimalToHex(reversed, 0);
		baseCodec += '.';
		if (this.hvcC.general_tier_flag === 0) {
			baseCodec += 'L';
		} else {
			baseCodec += 'H';
		}
		baseCodec += this.hvcC.general_level_idc;
		var hasByte = false;
		var constraint_string = "";
		for (i = 5; i >= 0; i--) {
			if (this.hvcC.general_constraint_indicator[i] || hasByte) {
				constraint_string = "."+BoxParser.decimalToHex(this.hvcC.general_constraint_indicator[i], 0)+constraint_string;
				hasByte = true;
			}
		}
		baseCodec += constraint_string;
	} 
	return baseCodec;
}

BoxParser.mp4aBox.prototype.getCodec = function() {
	var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.esds && this.esds.esd) {
		var oti = this.esds.esd.getOTI();
		var dsi = this.esds.esd.getAudioConfig();
		return baseCodec+"."+BoxParser.decimalToHex(oti)+(dsi ? "."+dsi: "");
	} else {
		return baseCodec;
	}
}


if (typeof exports !== "undefined") {
	exports.BoxParser = BoxParser;
}
