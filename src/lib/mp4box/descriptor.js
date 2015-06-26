/* 
 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
 * License: BSD-3-Clause (see LICENSE file)
 */
var MPEG4DescriptorParser = function () {
	var ES_DescrTag 			= 0x03;
	var DecoderConfigDescrTag 	= 0x04;
	var DecSpecificInfoTag 		= 0x05;
	var SLConfigDescrTag 		= 0x06;

	var descTagToName = [];
	descTagToName[ES_DescrTag] 				= "ES_Descriptor";
	descTagToName[DecoderConfigDescrTag] 	= "DecoderConfigDescriptor";
	descTagToName[DecSpecificInfoTag] 		= "DecoderSpecificInfo";
	descTagToName[SLConfigDescrTag] 		= "SLConfigDescriptor";

	var that = this;
	var classes = {};
		
	this.parseOneDescriptor = function (stream) {
		var hdrSize = 0;
		var size = 0;
		var tag;
		var desc;
		var byteRead;
		tag = stream.readUint8();
		hdrSize++;
		byteRead = stream.readUint8();
		hdrSize++;
		while (byteRead & 0x80) {		
			size = (byteRead & 0x7F)<<7;
			byteRead = stream.readUint8();
			hdrSize++;
		} 
		size += byteRead & 0x7F;
		Log.d("MPEG4DescriptorParser", "Found "+(descTagToName[tag] | "Descriptor "+tag)+", size "+size+" at position "+stream.position);
		if (descTagToName[tag]) {
			desc = new classes[descTagToName[tag]](size);
		} else {
			desc = new classes.Descriptor(size);
		}
		desc.parse(stream);
		return desc;
	}

	classes.Descriptor = function(_tag, _size) {
		this.tag = _tag;
		this.size = _size;
		this.descs = [];
	}

	classes.Descriptor.prototype.parse = function (stream) {
		this.data = stream.readUint8Array(this.size);
	}

	classes.Descriptor.prototype.findDescriptor = function (tag) {
		for (var i = 0; i < this.descs.length; i++) {
			if (this.descs[i].tag == tag) {
				return this.descs[i];
			}
		}
		return null;
	}

	classes.Descriptor.prototype.parseRemainingDescriptors = function (stream) {
		var start = stream.position;
		while (stream.position < start+this.size) {
			var desc = that.parseOneDescriptor(stream);
			this.descs.push(desc);
		}
	}

	classes.ES_Descriptor = function (size) {
		classes.Descriptor.call(this, ES_DescrTag, size);
	}
	
	classes.ES_Descriptor.prototype = new classes.Descriptor();

	classes.ES_Descriptor.prototype.parse = function(stream) {
		this.ES_ID = stream.readUint16();
		this.flags = stream.readUint8();
		this.size -= 3;
		if (this.flags & 0x80) {
			this.dependsOn_ES_ID = stream.readUint16();
			this.size -= 2;
		} else {
			this.dependsOn_ES_ID = 0;
		}
		if (this.flags & 0x40) {
			var l = stream.readUint8();
			this.URL = stream.readString(l);
			this.size -= l+1;
		} else {
			this.URL = null;
		}
		if (this.flags & 0x20) {
			this.OCR_ES_ID = stream.readUint16();
			this.size -= 2;
		} else {
			this.OCR_ES_ID = 0;
		}
		this.parseRemainingDescriptors(stream);
	}
	
	classes.ES_Descriptor.prototype.getOTI = function(stream) {
		var dcd = this.findDescriptor(DecoderConfigDescrTag);
		if (dcd) {
			return dcd.oti;
		} else {
			return 0;
		}
	}

	classes.ES_Descriptor.prototype.getAudioConfig = function(stream) {
		var dcd = this.findDescriptor(DecoderConfigDescrTag);
		if (!dcd) return null;
		var dsi = dcd.findDescriptor(DecSpecificInfoTag);
		if (dsi && dsi.data) {
			return (dsi.data[0]& 0xF8) >> 3;
		} else {
			return null;
		}
	}
	
	classes.DecoderConfigDescriptor = function (size) {
		classes.Descriptor.call(this, DecoderConfigDescrTag, size);
	}	
	classes.DecoderConfigDescriptor.prototype = new classes.Descriptor();

	classes.DecoderConfigDescriptor.prototype.parse = function(stream) {
		this.oti = stream.readUint8();
		this.streamType = stream.readUint8();
		this.bufferSize = stream.readUint24();
		this.maxBitrate = stream.readUint32();
		this.avgBitrate = stream.readUint32();
		this.size -= 13;
		this.parseRemainingDescriptors(stream);
	}

	classes.DecoderSpecificInfo = function (size) {
		classes.Descriptor.call(this, DecSpecificInfoTag, size);
	}
	classes.DecoderSpecificInfo.prototype = new classes.Descriptor();

	classes.SLConfigDescriptor = function (size) {
		classes.Descriptor.call(this, SLConfigDescrTag, size);
	}
	classes.SLConfigDescriptor.prototype = new classes.Descriptor();
	
	return this;
}
