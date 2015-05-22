/* 
 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
 * License: BSD-3-Clause (see LICENSE file)
 */
var MP4Box = function () {
	/* DataStream object used to parse the boxes */
	this.inputStream = null;
	/* List of ArrayBuffers, with a fileStart property, sorted in fileStart order and non overlapping */
	this.nextBuffers = [];	
	/* ISOFile object containing the parsed boxes */
	this.inputIsoFile = null;
	/* Callback called when the moov parsing starts */
	this.onMoovStart = null;
	/* Boolean keeping track of the call to onMoovStart, to avoid double calls */
	this.moovStartSent = false;
	/* Callback called when the moov is entirely parsed */
	this.onReady = null;
	/* Boolean keeping track of the call to onReady, to avoid double calls */
	this.readySent = false;	
	/* Callback to call when segments are ready */
	this.onSegment = null;
	/* Callback to call when samples are ready */
	this.onSamples = null;
	/* Callback to call when there is an error in the parsing or processing of samples */	
	this.onError = null;
	/* Boolean indicating if the moov box run-length encoded tables of sample information have been processed */
	this.sampleListBuilt = false;
	/* Array of Track objects for which fragmentation of samples is requested */
	this.fragmentedTracks = [];
	/* Array of Track objects for which extraction of samples is requested */
	this.extractedTracks = [];
	/* Boolean indicating that fragmented has started */
	this.isFragmentationStarted = false;
	/* Number of the next 'moof' to generate when fragmenting */
	this.nextMoofNumber = 0;
}

MP4Box.prototype.setSegmentOptions = function(id, user, options) {
	var trak = this.inputIsoFile.getTrackById(id);
	if (trak) {
		var fragTrack = {};
		this.fragmentedTracks.push(fragTrack);
		fragTrack.id = id;
		fragTrack.user = user;
		fragTrack.trak = trak;
		trak.nextSample = 0;
		fragTrack.segmentStream = null;
		fragTrack.nb_samples = 1000;
		fragTrack.rapAlignement = true;
		if (options) {
			if (options.nbSamples) fragTrack.nb_samples = options.nbSamples;
			if (options.rapAlignement) fragTrack.rapAlignement = options.rapAlignement;
		}
	}
}

MP4Box.prototype.unsetSegmentOptions = function(id) {
	var index = -1;
	for (var i = 0; i < this.fragmentedTracks.length; i++) {
		var fragTrack = this.fragmentedTracks[i];
		if (fragTrack.id == id) {
			index = i;
		}
	}
	if (index > -1) {
		this.fragmentedTracks.splice(index, 1);
	}
}

MP4Box.prototype.setExtractionOptions = function(id, user, options) {
	var trak = this.inputIsoFile.getTrackById(id);
	if (trak) {
		var extractTrack = {};
		this.extractedTracks.push(extractTrack);
		extractTrack.id = id;
		extractTrack.user = user;
		extractTrack.trak = trak;
		trak.nextSample = 0;
		extractTrack.nb_samples = 1000;
		extractTrack.samples = [];
		if (options) {
			if (options.nbSamples) extractTrack.nb_samples = options.nbSamples;
		}
	}
}

MP4Box.prototype.unsetExtractionOptions = function(id) {
	var index = -1;
	for (var i = 0; i < this.extractedTracks.length; i++) {
		var extractTrack = this.extractedTracks[i];
		if (extractTrack.id == id) {
			index = i;
		}
	}
	if (index > -1) {
		this.extractedTracks.splice(index, 1);
	}
}

MP4Box.prototype.createSingleSampleMoof = function(sample) {
	var moof = new BoxParser.moofBox();
	var mfhd = new BoxParser.mfhdBox();
	mfhd.sequence_number = this.nextMoofNumber;
	this.nextMoofNumber++;
	moof.boxes.push(mfhd);
	var traf = new BoxParser.trafBox();
	moof.boxes.push(traf);
	var tfhd = new BoxParser.tfhdBox();
	traf.boxes.push(tfhd);
	tfhd.track_id = sample.track_id;
	tfhd.flags = BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF;
	var tfdt = new BoxParser.tfdtBox();
	traf.boxes.push(tfdt);
	tfdt.baseMediaDecodeTime = sample.dts;
	var trun = new BoxParser.trunBox();
	traf.boxes.push(trun);
	moof.trun = trun;
	trun.flags = BoxParser.TRUN_FLAGS_DATA_OFFSET | BoxParser.TRUN_FLAGS_DURATION | 
				 BoxParser.TRUN_FLAGS_SIZE | BoxParser.TRUN_FLAGS_FLAGS | 
				 BoxParser.TRUN_FLAGS_CTS_OFFSET;
	trun.data_offset = 0;
	trun.first_sample_flags = 0;
	trun.sample_count = 1;
	trun.sample_duration = [];
	trun.sample_duration[0] = sample.duration;
	trun.sample_size = [];
	trun.sample_size[0] = sample.size;
	trun.sample_flags = [];
	trun.sample_flags[0] = 0;
	trun.sample_composition_time_offset = [];
	trun.sample_composition_time_offset[0] = sample.cts - sample.dts;
	return moof;
}

MP4Box.prototype.createFragment = function(input, track_id, sampleNumber, stream_) {
	var trak = this.inputIsoFile.getTrackById(track_id);
	var sample = this.inputIsoFile.getSample(trak, sampleNumber);
	if (sample == null) {
		if (this.nextSeekPosition) {
			this.nextSeekPosition = Math.min(trak.samples[sampleNumber].offset,this.nextSeekPosition);
		} else {
			this.nextSeekPosition = trak.samples[sampleNumber].offset;
		}
		return null;
	}
	
	var stream = stream_ || new DataStream();
	stream.endianness = DataStream.BIG_ENDIAN;

	var moof = this.createSingleSampleMoof(sample);
	moof.write(stream);

	/* adjusting the data_offset now that the moof size is known*/
	moof.trun.data_offset = moof.size+8; //8 is mdat header
	Log.d("BoxWriter", "Adjusting data_offset with new value "+moof.trun.data_offset);
	stream.adjustUint32(moof.trun.data_offset_position, moof.trun.data_offset);
		
	var mdat = new BoxParser.mdatBox();
	mdat.data = sample.data;
	mdat.write(stream);
	return stream;
}

/* helper functions to enable calling "open" with additional buffers */
ArrayBuffer.concat = function(buffer1, buffer2) {
  Log.d("ArrayBuffer", "Trying to create a new buffer of size: "+(buffer1.byteLength + buffer2.byteLength));
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

/* Reduces the size of a given buffer */
MP4Box.prototype.reduceBuffer = function(buffer, offset, newLength) {
	var smallB;
	smallB = new Uint8Array(newLength);
	smallB.set(new Uint8Array(buffer, offset, newLength));
	smallB.buffer.fileStart = buffer.fileStart+offset;
	smallB.buffer.usedBytes = 0;
	return smallB.buffer;	
}

/* insert the new buffer in the sorted list of buffers (nextBuffers), 
   making sure, it is not overlapping with existing ones (possibly reducing its size).
   if the new buffer overrides/replaces the 0-th buffer (for instance because it is bigger), 
   updates the DataStream buffer for parsing */
MP4Box.prototype.insertBuffer = function(ab) {	
	var to_add = true;
	/* TODO: improve insertion if many buffers */
	for (var i = 0; i < this.nextBuffers.length; i++) {
		var b = this.nextBuffers[i];
		if (ab.fileStart <= b.fileStart) {
			/* the insertion position is found */
			if (ab.fileStart === b.fileStart) {
				/* The new buffer overlaps with an existing buffer */
				if (ab.byteLength >  b.byteLength) {
					/* the new buffer is bigger than the existing one
					   remove the existing buffer and try again to insert 
					   the new buffer to check overlap with the next ones */
					this.nextBuffers.splice(i, 1);
					i--; 
					continue;
				} else {
					/* the new buffer is smaller than the existing one, just drop it */
					Log.w("MP4Box", "Buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+") already appended, ignoring");
				}
			} else {
				/* The beginning of the new buffer is not overlapping with an existing buffer
				   let's check the end of it */
				if (ab.fileStart + ab.byteLength <= b.fileStart) {
					/* no overlap, we can add it as is */
				} else {
					/* There is some overlap, cut the new buffer short, and add it*/
					ab = this.reduceBuffer(ab, 0, b.fileStart - ab.fileStart);
				}
				Log.d("MP4Box", "Appending new buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+")");
				this.nextBuffers.splice(i, 0, ab);
				/* if this new buffer is inserted in the first place in the list of the buffer, 
				   and the DataStream is initialized, make it the buffer used for parsing */
				if (i === 0 && this.inputStream !== null) {
					this.inputStream.buffer = ab;
				}
			}
			to_add = false;
			break;
		} else if (ab.fileStart < b.fileStart + b.byteLength) {
			/* the new buffer overlaps its beginning with the end of the current buffer */
			var offset = b.fileStart + b.byteLength - ab.fileStart;
			var newLength = ab.byteLength - offset;
			if (newLength > 0) {
				/* the new buffer is bigger than the current overlap, drop the overlapping part and try again inserting the remaining buffer */
				ab = this.reduceBuffer(ab, offset, newLength);
			} else {
				/* the content of the new buffer is entirely contained in the existing buffer, drop it entirely */
				to_add = false;
				break;
			}
		}
	}
	/* if the buffer has not been added, we can add it at the end */
	if (to_add) {
		Log.d("MP4Box", "Appending new buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+")");
		this.nextBuffers.push(ab);
		/* if this new buffer is inserted in the first place in the list of the buffer, 
		   and the DataStream is initialized, make it the buffer used for parsing */
		if (i === 0 && this.inputStream !== null) {
			this.inputStream.buffer = ab;
		}
	}
}

MP4Box.prototype.processSamples = function() {
	var i;
	var trak;
	/* For each track marked for fragmentation, 
	   check if the next sample is there (i.e. if the sample information is known (i.e. moof has arrived) and if it has been downloaded) 
	   and create a fragment with it */
	if (this.isFragmentationStarted && this.onSegment !== null) {
		for (i = 0; i < this.fragmentedTracks.length; i++) {
			var fragTrak = this.fragmentedTracks[i];
			trak = fragTrak.trak;
			while (trak.nextSample < trak.samples.length) {				
				/* The sample information is there (either because the file is not fragmented and this is not the last sample, 
				or because the file is fragmented and the moof for that sample has been received */
				Log.d("MP4Box", "Creating media fragment on track #"+fragTrak.id +" for sample "+trak.nextSample); 
				var result = this.createFragment(this.inputIsoFile, fragTrak.id, trak.nextSample, fragTrak.segmentStream);
				if (result) {
					fragTrak.segmentStream = result;
					trak.nextSample++;
				} else {
					/* The fragment could not be created because the media data is not there (not downloaded), wait for it */
					break;
				}
				/* A fragment is created by sample, but the segment is the accumulation in the buffer of these fragments.
				   It is flushed only as requested by the application (nb_samples) to avoid too many callbacks */
				if (trak.nextSample % fragTrak.nb_samples === 0 || trak.nextSample >= trak.samples.length) {
					Log.i("MP4Box", "Sending fragmented data on track #"+fragTrak.id+" for samples ["+(trak.nextSample-fragTrak.nb_samples)+","+(trak.nextSample-1)+"]"); 
					if (this.onSegment) {
						this.onSegment(fragTrak.id, fragTrak.user, fragTrak.segmentStream.buffer, trak.nextSample);
					}
					/* force the creation of a new buffer */
					fragTrak.segmentStream = null;
					if (fragTrak !== this.fragmentedTracks[i]) {
						/* make sure we can stop fragmentation if needed */
						break;
					}
				}
			}
		}
	}

	if (this.onSamples !== null) {
		/* For each track marked for data export, 
		   check if the next sample is there (i.e. has been downloaded) and send it */
		for (i = 0; i < this.extractedTracks.length; i++) {
			var extractTrak = this.extractedTracks[i];
			trak = extractTrak.trak;
			while (trak.nextSample < trak.samples.length) {				
				Log.d("MP4Box", "Exporting on track #"+extractTrak.id +" sample #"+trak.nextSample);
				var sample = this.inputIsoFile.getSample(trak, trak.nextSample);
				if (sample) {
					trak.nextSample++;
					extractTrak.samples.push(sample);
				} else {
					return;
				}
				if (trak.nextSample % extractTrak.nb_samples === 0 || trak.nextSample >= trak.samples.length) {
					Log.d("MP4Box", "Sending samples on track #"+extractTrak.id+" for sample "+trak.nextSample); 
					if (this.onSamples) {
						this.onSamples(extractTrak.id, extractTrak.user, extractTrak.samples);
					}
					extractTrak.samples = [];
					if (extractTrak !== this.extractedTracks[i]) {
						/* check if the extraction needs to be stopped */
						break;
					}
				}
			}
		}
	}
}

/* Processes a new ArrayBuffer (with a fileStart property)
   Returns the next expected file position, or undefined if not ready to parse */
MP4Box.prototype.appendBuffer = function(ab) {
	var nextFileStart;
	var firstBuffer;
	if (ab === null || ab === undefined) {
		throw("Buffer must be defined and non empty");
	}	
	if (ab.fileStart === undefined) {
		throw("Buffer must have a fileStart property");
	}	
	if (ab.byteLength === 0) {
		Log.w("MP4Box", "Ignoring empty buffer (fileStart: "+ab.fileStart+")");
		return;
	}
	/* mark the bytes in the buffer as not being used yet */
	ab.usedBytes = 0;
	this.insertBuffer(ab);

	/* We create the DataStream object only when we have the first bytes of the file */
	if (!this.inputStream) { 
		if (this.nextBuffers.length > 0) {
			firstBuffer = this.nextBuffers[0];
			if (firstBuffer.fileStart === 0) {
				this.inputStream = new DataStream(firstBuffer, 0, DataStream.BIG_ENDIAN);	
				this.inputStream.nextBuffers = this.nextBuffers;
				this.inputStream.bufferIndex = 0;
			} else {
				Log.w("MP4Box", "The first buffer should have a fileStart of 0");
				return;
			}
		} else {
			Log.w("MP4Box", "No buffer to start parsing from");
			return;
		}		
	} 

	/* Initialize the ISOFile object if not yet created */
	if (!this.inputIsoFile) {
		this.inputIsoFile = new ISOFile(this.inputStream);
	}

	/* Parse whatever is in the existing buffers */
	this.inputIsoFile.parse();

	/* Check if the moovStart callback needs to be called */
	if (this.inputIsoFile.moovStartFound && !this.moovStartSent) {
		this.moovStartSent = true;
		if (this.onMoovStart) this.onMoovStart();
	}

	if (this.inputIsoFile.moov) {
		/* A moov box has been entirely parsed */
		
		/* if this is the first call after the moov is found we initialize the list of samples (may be empty in fragmented files) */
		if (!this.sampleListBuilt) {
			this.inputIsoFile.buildSampleLists();
			this.sampleListBuilt = true;
		} 

		/* We update the sample information if there are any new moof boxes */
		this.inputIsoFile.updateSampleLists();
		
		/* If the application needs to be informed that the 'moov' has been found, 
		   we create the information object and callback the application */
		if (this.onReady && !this.readySent) {
			var info = this.getInfo();
			this.readySent = true;
			this.onReady(info);
		}

		/* See if any sample extraction or segment creation needs to be done with the available samples */
		this.processSamples();

		/* Inform about the best range to fetch next */
		if (this.nextSeekPosition) {
			nextFileStart = this.nextSeekPosition;
			this.nextSeekPosition = undefined;
		} else {
			nextFileStart = this.inputIsoFile.nextParsePosition;
		}		
		var index = this.inputIsoFile.findPosition(true, nextFileStart);
		if (index !== -1) {
			nextFileStart = this.inputIsoFile.findEndContiguousBuf(index);
		}
		Log.i("MP4Box", "Next buffer to fetch should have a fileStart position of "+nextFileStart);
		return nextFileStart;
	} else {
		if (this.inputIsoFile !== null) {
			/* moov has not been parsed but the first buffer was received, 
			   the next fetch should probably be the next box start */
			return this.inputIsoFile.nextParsePosition;
		} else {
			/* No valid buffer has been parsed yet, we cannot know what to parse next */
			return 0;
		}
	}	
}

MP4Box.prototype.getInfo = function() {
	var movie = {};
	var trak;
	var track;
	var sample_desc;
	var _1904 = (new Date(4, 0, 1, 0, 0, 0, 0).getTime());

	movie.duration = this.inputIsoFile.moov.mvhd.duration;
	movie.timescale = this.inputIsoFile.moov.mvhd.timescale;
	movie.isFragmented = (this.inputIsoFile.moov.mvex != null);
	if (movie.isFragmented && this.inputIsoFile.moov.mvex.mehd) {
		movie.fragment_duration = this.inputIsoFile.moov.mvex.mehd.fragment_duration;
	} else {
		movie.fragment_duration = 0;
	}
	movie.isProgressive = this.inputIsoFile.isProgressive;
	movie.hasIOD = (this.inputIsoFile.moov.iods != null);
	movie.brands = []; 
	movie.brands.push(this.inputIsoFile.ftyp.major_brand);
	movie.brands = movie.brands.concat(this.inputIsoFile.ftyp.compatible_brands);	
	movie.created = new Date(_1904+this.inputIsoFile.moov.mvhd.creation_time*1000);
	movie.modified = new Date(_1904+this.inputIsoFile.moov.mvhd.modification_time*1000);
	movie.tracks = [];
	movie.audioTracks = [];
	movie.videoTracks = [];
	movie.subtitleTracks = [];
	movie.metadataTracks = [];
	movie.hintTracks = [];
	movie.otherTracks = [];
	for (i = 0; i < this.inputIsoFile.moov.traks.length; i++) {
		trak = this.inputIsoFile.moov.traks[i];
		sample_desc = trak.mdia.minf.stbl.stsd.entries[0];
		track = {};
		movie.tracks.push(track);
		track.id = trak.tkhd.track_id;
		track.references = [];
		if (trak.tref) {
			for (j = 0; j < trak.tref.boxes.length; j++) {
				ref = {};
				track.references.push(ref);
				ref.type = trak.tref.boxes[j].type;
				ref.track_ids = trak.tref.boxes[j].track_ids;
			}
		}
		track.created = new Date(_1904+trak.tkhd.creation_time*1000);
		track.modified = new Date(_1904+trak.tkhd.modification_time*1000);
		track.movie_duration = trak.tkhd.duration;
		track.layer = trak.tkhd.layer;
		track.alternate_group = trak.tkhd.alternate_group;
		track.volume = trak.tkhd.volume;
		track.matrix = trak.tkhd.matrix;
		track.track_width = trak.tkhd.width/(1<<16);
		track.track_height = trak.tkhd.height/(1<<16);
		track.timescale = trak.mdia.mdhd.timescale;
		track.duration = trak.mdia.mdhd.duration;
		track.codec = sample_desc.getCodec();	
		track.language = trak.mdia.mdhd.languageString;
		track.nb_samples = trak.samples.length;
		track.size = 0;
		for (j = 0; j < track.nb_samples; j++) {
			track.size += trak.samples[j].size;
		}
		track.bitrate = (track.size*8*track.timescale)/track.duration;
		if (sample_desc.isAudio()) {
			movie.audioTracks.push(track);
			track.audio = {};
			track.audio.sample_rate = sample_desc.getSampleRate();		
			track.audio.channel_count = sample_desc.getChannelCount();		
			track.audio.sample_size = sample_desc.getSampleSize();		
		} else if (sample_desc.isVideo()) {
			movie.videoTracks.push(track);
			track.video = {};
			track.video.width = sample_desc.getWidth();		
			track.video.height = sample_desc.getHeight();		
		} else if (sample_desc.isSubtitle()) {
			movie.subtitleTracks.push(track);
		} else if (sample_desc.isHint()) {
			movie.hintTracks.push(track);
		} else if (sample_desc.isMetadata()) {
			movie.metadataTracks.push(track);
		} else {
			movie.otherTracks.push(track);
		}
	}
	return movie;
}

MP4Box.prototype.getInitializationSegment = function() {
	var stream = new DataStream();
	stream.endianness = DataStream.BIG_ENDIAN;
	this.inputIsoFile.writeInitializationSegment(stream);
	return stream.buffer;
}

MP4Box.prototype.writeFile = function() {
	var stream = new DataStream();
	stream.endianness = DataStream.BIG_ENDIAN;
	this.inputIsoFile.write(stream);
	return stream.buffer;
}

MP4Box.prototype.initializeSegmentation = function() {
	var i;
	var j;
	var box;
	var initSegs;
	var trak;
	if (this.onSegment === null) {
		Log.w("MP4Box", "No segmentation callback set!");
	}
	if (!this.isFragmentationStarted) {
		this.isFragmentationStarted = true;		
		this.nextMoofNumber = 0;
		this.inputIsoFile.resetTables();
	}	
	initSegs = [];
	for (i = 0; i < this.fragmentedTracks.length; i++) {
		/* removing all tracks to create initialization segments with only one track */
		for (j = 0; j < this.inputIsoFile.moov.boxes.length; j++) {
			box = this.inputIsoFile.moov.boxes[j];
			if (box && box.type === "trak") {
				this.inputIsoFile.moov.boxes[j].ignore = true;
				this.inputIsoFile.moov.boxes[j] = null;
			}
		}
		/* adding only the needed track */
		trak = this.inputIsoFile.getTrackById(this.fragmentedTracks[i].id);
		delete trak.ignore;
		for (j = 0; j < this.inputIsoFile.moov.boxes.length; j++) {
			box = this.inputIsoFile.moov.boxes[j];
			if (box == null) {
				this.inputIsoFile.moov.boxes[j] = trak;
				break;
			}
		}
		seg = {};
		seg.id = trak.tkhd.track_id;
		seg.user = this.fragmentedTracks[i].user;
		seg.buffer = this.getInitializationSegment();
		initSegs.push(seg);
	}
	return initSegs;
}

/* Called by the application to release the resources associated to samples already forwarded to the application */
MP4Box.prototype.releaseUsedSamples = function (id, sampleNum) {
	var size = 0;
	var trak = this.inputIsoFile.getTrackById(id);
	if (!trak.lastValidSample) trak.lastValidSample = 0;
	for (var i = trak.lastValidSample; i < sampleNum; i++) {
		size+=this.inputIsoFile.releaseSample(trak, i);
	}
	Log.d("MP4Box", "Track #"+id+" released samples up to "+sampleNum+" (total size: "+size+", remaining: "+this.inputIsoFile.samplesDataSize+")");
	trak.lastValidSample = sampleNum;
}

/* Called by the application to flush the remaining samples, once the download is finished */
MP4Box.prototype.flush = function() {
	Log.i("MP4Box", "Flushing remaining samples");
	this.inputIsoFile.updateSampleLists();
	this.processSamples();
}

/* Finds the byte offset for a given time on a given track
   also returns the time of the previous rap */
MP4Box.prototype.seekTrack = function(time, useRap, trak) {
	var j;
	var sample;
	var rap_offset = Infinity;
	var rap_time = 0;
	var seek_offset = Infinity;
	var rap_seek_sample_num = 0;
	var seek_sample_num = 0;
	var timescale;
	for (j = 0; j < trak.samples.length; j++) {
		sample = trak.samples[j];
		if (j === 0) {
			seek_offset = sample.offset;
			seek_sample_num = 0;
			timescale = sample.timescale;
		} else if (sample.cts > time * sample.timescale) {
			seek_offset = trak.samples[j-1].offset;
			seek_sample_num = j-1;
			break;
		} 
		if (useRap && sample.is_rap) {
			rap_offset = sample.offset;
			rap_time = sample.cts;
			rap_seek_sample_num = j;
		}
	}
	if (useRap) {
		trak.nextSample = rap_seek_sample_num;
		Log.i("MP4Box", "Seeking to RAP sample #"+trak.nextSample+" on track "+trak.tkhd.track_id+", time "+Log.getDurationString(rap_time, timescale) +" and offset: "+rap_offset);
		return { offset: rap_offset, time: rap_time/timescale };
	} else {
		trak.nextSample = seek_sample_num;
		Log.i("MP4Box", "Seeking to non-RAP sample #"+trak.nextSample+" on track "+trak.tkhd.track_id+", time "+Log.getDurationString(time)+" and offset: "+rap_offset);
		return { offset: seek_offset, time: time };
	}
}

/* Finds the byte offset in the file corresponding to the given time or to the time of the previous RAP */
MP4Box.prototype.seek = function(time, useRap) {
	var moov = this.inputIsoFile.moov;
	var trak;
	var trak_seek_info;
	var i;
	var seek_info = { offset: Infinity, time: Infinity };
	if (!this.inputIsoFile.moov) {
		throw "Cannot seek: moov not received!";
	} else {
		for (i = 0; i<moov.traks.length; i++) {
			trak = moov.traks[i];			
			trak_seek_info = this.seekTrack(time, useRap, trak);
			if (trak_seek_info.offset < seek_info.offset) {
				seek_info.offset = trak_seek_info.offset;
			}
			if (trak_seek_info.time < seek_info.time) {
				seek_info.time = trak_seek_info.time;
			}
		}
		if (seek_info.offset === Infinity) {
			/* No sample info, in all tracks, cannot seek */
			seek_info = { offset: this.inputIsoFile.nextParsePosition, time: 0 };
		} else {
			var index = this.inputIsoFile.findPosition(true, seek_info.offset);
			if (index !== -1) {
				seek_info.offset = this.inputIsoFile.findEndContiguousBuf(index);
			}
		}
		Log.i("MP4Box", "Seeking at time "+Log.getDurationString(seek_info.time, 1)+" needs a buffer with a fileStart position of "+seek_info.offset);
		return seek_info;
	}
}

MP4Box.prototype.getTrackSamplesInfo = function(track_id) {
	var track = this.inputIsoFile.getTrackById(id);
	if (track) {
		return track.samples;
	} else {
		return;
	}
}

MP4Box.prototype.getTrackSample = function(track_id, number) {
	var track = this.inputIsoFile.getTrackById(track_id);
	var sample = this.inputIsoFile.getSample(track, number);
	return sample;	
}

if (typeof exports !== 'undefined') {
	exports.MP4Box = MP4Box;	
}
