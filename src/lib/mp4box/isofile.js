/* 
 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
 * License: BSD-3-Clause (see LICENSE file)
 */
var ISOFile = function (stream) {
	/* DataStream object (extended with multiple underlying buffers) used to parse boxes */
	this.stream = stream;
	/* Array of all boxes (in order) found in the file */
	this.boxes = [];
	/* Array of all mdats */
	this.mdats = [];
	/* Array of all moofs */
	this.moofs = [];
	/* Boolean indicating if the file is compatible with progressive parsing (moov first) */
	this.isProgressive = false;
	/* Index of the last moof box received */
	this.lastMoofIndex = 0;
	/* position in the current buffer of the beginning of the last box parsed */
	this.lastBoxStartPosition = 0;
	/* indicator if the parsing is stuck in the middle of an mdat box */
	this.parsingMdat = null;
	/* Boolean used to fire moov start event only once */
	this.moovStartFound = false;
	/* size of the buffers allocated for samples */
	this.samplesDataSize = 0;
	/* next file position that the parser needs:
	    - 0 until the first buffer (i.e. fileStart ===0) has been received 
	    - otherwise, the next box start until the moov box has been parsed
	    - otherwise, the position of the next sample to fetch
	 */
	this.nextParsePosition = 0;
}

ISOFile.prototype.mergeNextBuffer = function() {
	var next_buffer;
	if (this.stream.bufferIndex+1 < this.stream.nextBuffers.length) {
		next_buffer = this.stream.nextBuffers[this.stream.bufferIndex+1];
		if (next_buffer.fileStart === this.stream.buffer.fileStart + this.stream.buffer.byteLength) {
			var oldLength = this.stream.buffer.byteLength;
			var oldUsedBytes = this.stream.buffer.usedBytes;
			var oldFileStart = this.stream.buffer.fileStart;
			this.stream.nextBuffers[this.stream.bufferIndex] = ArrayBuffer.concat(this.stream.buffer, next_buffer);
			this.stream.buffer = this.stream.nextBuffers[this.stream.bufferIndex];
			this.stream.nextBuffers.splice(this.stream.bufferIndex+1, 1);
			this.stream.buffer.usedBytes = oldUsedBytes; /* TODO: should it be += ? */
			this.stream.buffer.fileStart = oldFileStart;
			Log.d("ISOFile", "Concatenating buffer for box parsing (length: "+oldLength+"->"+this.stream.buffer.byteLength+")");
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

ISOFile.prototype.parse = function() {
	var found;
	var ret;
	var box;
	
	Log.d("ISOFile","Starting parsing with buffer #"+this.stream.bufferIndex+" (fileStart: "+this.stream.buffer.fileStart+" - Length: "+this.stream.buffer.byteLength+") from position "+this.lastBoxStartPosition+
		" ("+(this.stream.buffer.fileStart+this.lastBoxStartPosition)+" in the file)");

	/* Reposition at the start position of the previous box not entirely parsed */
	this.stream.seek(this.lastBoxStartPosition);

	while (true) {
		
		if (this.parsingMdat !== null) {
			/* we are in the parsing of an incomplete mdat box */
			box = this.parsingMdat;

			found = this.reposition(false, box.fileStart + box.hdr_size + box.size);
			if (found) {
				Log.d("ISOFile", "Found 'mdat' end in buffer #"+this.stream.bufferIndex);
				/* the end of the mdat has been found */ 
				this.parsingMdat = null;
				/* we can parse more in this buffer */
				continue;
			} else {
				/* we don't have the end of this mdat yet, 
				   indicate that the next byte to fetch is the end of the buffers we have so far, 
				   return and wait for more buffer to come */
				this.nextParsePosition = this.findEndContiguousBuf(this.stream.bufferIndex);
				return;
			}
		} else {
			/* not parsing an 'mdat' box
			/* remember the position of the box start in case we need to roll back (if the box is incomplete) */
			this.lastBoxStartPosition = this.stream.position;
			ret = BoxParser.parseOneBox(this.stream);
			if (ret.code === BoxParser.ERR_NOT_ENOUGH_DATA) {		
				/* we did not have enough bytes in the current buffer to parse the entire box */
				if (ret.type === "mdat") { 
					/* we had enough bytes to get its type and size and it's an 'mdat' */
					
					/* special handling for mdat boxes, since we don't actually need to parse it linearly 
					   we create the box */
					box = new BoxParser[ret.type+"Box"](ret.size-ret.hdr_size);	
					this.parsingMdat = box;
					this.boxes.push(box);
					this.mdats.push(box);			
					box.fileStart = this.stream.buffer.fileStart + this.stream.position;
					box.hdr_size = ret.hdr_size;
					this.stream.buffer.usedBytes += ret.hdr_size;
					
					/* let's see if we have the end of the box in the other buffers */
					found = this.reposition(false, box.fileStart + box.hdr_size + box.size);
					if (found) {
						/* found the end of the box */
						this.parsingMdat = null;
						/* let's see if we can parse more in this buffer */
						continue;
					} else {
						/* 'mdat' end not found in the existing buffers */
						/* determine the next position in the file to start parsing from */
						if (!this.moovStartFound) {
							/* moov not find yet, 
							   the file probably has 'mdat' at the beginning, and 'moov' at the end, 
							   indicate that the downloader should not try to download those bytes now */
							this.nextParsePosition = box.fileStart + box.size + box.hdr_size;
						} else {
							/* we have the start of the moov box, 
							   the next bytes should try to complete the current 'mdat' */
							this.nextParsePosition = this.findEndContiguousBuf(this.stream.bufferIndex);
						}
						/* not much we can do, wait for more buffers to arrive */
						return;
					}
				} else {
					/* box is incomplete, we may not even know its type */
					if (ret.type === "moov") { 
						/* the incomplete box is a 'moov' box */
						this.moovStartFound = true;
						if (this.mdats.length === 0) {
							this.isProgressive = true;
						}
					}
					/* either it's not an mdat box (and we need to parse it, we cannot skip it)
					   (TODO: we could skip 'free' boxes ...)
  					   or we did not have enough data to parse the type and size of the box, 
					   we try to concatenate the current buffer with the next buffer to restart parsing */
					merged = this.mergeNextBuffer();
					if (merged) {
						/* The next buffer was contiguous, the merging succeeded,
						   we can now continue parsing, 
						   the next best position to parse is at the end of this new buffer */
						this.nextParsePosition = this.stream.buffer.fileStart + this.stream.buffer.byteLength;
						continue;
					} else {
						/* we cannot concatenate existing buffers because they are not contiguous or because there is no additional buffer */
						/* The next best position to parse is still at the end of this old buffer */
						if (!ret.type) {
							/* There were not enough bytes in the buffer to parse the box type and length,
							   the next fetch should retrieve those missing bytes, i.e. the next bytes after this buffer */
							this.nextParsePosition = this.stream.buffer.fileStart + this.stream.buffer.byteLength;
						} else {
							/* we had enough bytes to parse size and type of the incomplete box
							   if we haven't found yet the moov box, skip this one and try the next one 
							   if we have found the moov box, let's continue linear parsing */
							if (this.moovStartFound) {
								this.nextParsePosition = this.stream.buffer.fileStart + this.stream.buffer.byteLength;
							} else {
								this.nextParsePosition = this.stream.buffer.fileStart + this.stream.position + ret.size;
							}
						}
						return;
					}
				}
			} else {
				/* the box is entirely parsed */
				box = ret.box;
				/* store the box in the 'boxes' array to preserve box order (for file rewrite if needed)  */
				this.boxes.push(box);
				/* but also store box in a property for more direct access */
				switch (box.type) {
					case "mdat":
						this.mdats.push(box);
						/* remember the position in the file of this box for comparison with sample offsets */
						box.fileStart = this.stream.buffer.fileStart + box.start;
						break;
					case "moof":
						this.moofs.push(box);
						break;
					case "moov":					
						this.moovStartFound = true;
						if (this.mdats.length === 0) {
							this.isProgressive = true;
						}
						/* no break */
						/* falls through */
					default:
						if (this[box.type] !== undefined) {
							Log.w("ISOFile", "Duplicate Box of type: "+box.type+", overriding previous occurrence");
						}
						this[box.type] = box;
						break;
				}
				if (box.type === "mdat") {
					/* for an mdat box, only its header is considered used, other bytes will be used when sample data is requested */
					this.stream.buffer.usedBytes += box.hdr_size;
				} else {
					/* for all other boxes, the entire box data is considered used */
					this.stream.buffer.usedBytes += ret.size;
				}
			}
		}
	}
}

/* Searches for the buffer containing the given file position:
  - if found, repositions the parsing from there and returns true 
  - if not found, does not change anything and returns false */
ISOFile.prototype.reposition = function(fromStart, filePosition) {
	var index;
	index = this.findPosition(fromStart, filePosition);
	if (index !== -1) {
		this.stream.buffer = this.stream.nextBuffers[index];
		this.stream.bufferIndex = index;
		this.stream.position = filePosition - this.stream.buffer.fileStart;
		Log.d("ISOFile", "Repositioning parser at buffer position: "+this.stream.position);
		return true;
	} else {
		return false;
	}
}

/* Searches for the buffer containing the given file position
   Returns the index of the buffer (-1 if not found) */
ISOFile.prototype.findPosition = function(fromStart, filePosition) {
	var i;
	var buffer = null;
	var index = -1;

	/* find the buffer with the largest position smaller than the given position */
	if (fromStart === true) {
	   /* the reposition can be in the past, we need to check from the beginning of the list of buffers */
		i = 0;
	} else {
		i = this.stream.bufferIndex;
	}

	while (i < this.stream.nextBuffers.length) {
		buffer = this.stream.nextBuffers[i];
		if (buffer.fileStart <= filePosition) {
			index = i;
		} else {
			break;
		}
		i++;
	}

	if (index !== -1) {
		buffer = this.stream.nextBuffers[index];
		if (buffer.fileStart + buffer.byteLength >= filePosition) {			
			Log.d("ISOFile", "Found position in existing buffer #"+index);
			return index;
		} else {
			return -1;
		}
	} else {
		return -1;
	}
}

ISOFile.prototype.findEndContiguousBuf = function(index) {
	var i;
	var currentBuf;
	var nextBuf;
	currentBuf = this.stream.nextBuffers[index];
	/* find the end of the contiguous range of data */
	if (this.stream.nextBuffers.length > index+1) {
		for (i = index+1; i < this.stream.nextBuffers.length; i++) {
			nextBuf = this.stream.nextBuffers[i];
			if (nextBuf.fileStart === currentBuf.fileStart + currentBuf.byteLength) {
				currentBuf = nextBuf;
			} else {
				break;
			}
		}
	}
	/* return the position of last byte in the file that we have */
	return currentBuf.fileStart + currentBuf.byteLength;
}

/* Rewrite the entire file */
ISOFile.prototype.write = function(outstream) {
	for (var i=0; i<this.boxes.length; i++) {
		this.boxes[i].write(outstream);
	}
}

/* Modify the file and create the initialization segment */
ISOFile.prototype.writeInitializationSegment = function(outstream) {
	var i;
	var index;
	var mehd;
	var trex;
	var box;
	Log.d("ISOFile", "Generating initialization segment");
	/* write the ftyp box as is in the input, may need to be fixed for DASH brands ?*/
	this.ftyp.write(outstream);

	/* The input file may be fragmented and have an mvex box, we just retrieve the duration and delele that box  */
	if (this.moov.mvex) {
		this.initial_duration = this.moov.mvex.mehd.fragment_duration;
		/* find this mvex box in the array of boxes and remove it */
		index = -1;
		for (i = 0; i < this.moov.boxes.length; i++) {
			box = this.moov.boxes[i];
			if (box === this.moov.mvex) {
				index = i;
			}
		}
		if (index > -1) {
			this.moov.boxes.splice(index, 1);
		}
		this.moov.mvex = null;
	}
	/* we can now create the new mvex box */
	this.moov.mvex = new BoxParser.mvexBox();
	this.moov.boxes.push(this.moov.mvex);
	this.moov.mvex.mehd = new BoxParser.mehdBox();
	this.moov.mvex.boxes.push(this.moov.mvex.mehd);
	this.moov.mvex.mehd.fragment_duration = this.initial_duration; // restore the same duration
	for (i = 0; i < this.moov.traks.length; i++) {
		if (this.moov.traks[i].ignore) continue;
		trex = new BoxParser.trexBox();
		this.moov.mvex.boxes.push(trex);
		trex.track_id = this.moov.traks[i].tkhd.track_id;
		trex.default_sample_description_index = 1;
		trex.default_sample_duration = (this.moov.traks[i].samples.length>0 ? this.moov.traks[i].samples[0].duration: 0);
		trex.default_sample_size = 0;
		trex.default_sample_flags = 1<<16;
	}
	this.moov.write(outstream);
}

/* Resets all sample tables */
ISOFile.prototype.resetTables = function () {
	var i;
	var trak, stco, stsc, stsz, stts, ctts, stss;
	this.initial_duration = this.moov.mvhd.duration;
	this.moov.mvhd.duration = 0;
	for (i = 0; i < this.moov.traks.length; i++) {
		trak = this.moov.traks[i];
		trak.tkhd.duration = 0;
		trak.mdia.mdhd.duration = 0;
		stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
		stco.chunk_offsets = [];
		stsc = trak.mdia.minf.stbl.stsc;
		stsc.first_chunk = [];
		stsc.samples_per_chunk = [];
		stsc.sample_description_index = [];
		stsz = trak.mdia.minf.stbl.stsz;
		stsz.sample_sizes = [];
		stts = trak.mdia.minf.stbl.stts;
		stts.sample_counts = [];
		stts.sample_deltas = [];
		ctts = trak.mdia.minf.stbl.ctts;
		if (ctts) {
			ctts.sample_counts = [];
			ctts.sample_offsets = [];
		}
		stss = trak.mdia.minf.stbl.stss;
		var k = trak.mdia.minf.stbl.boxes.indexOf(stss);
		if (k != -1) trak.mdia.minf.stbl.boxes[k] = null;
	}
}

/* Build initial sample list from  sample tables */
ISOFile.prototype.buildSampleLists = function() {	
	var i, j, k;
	var trak, stco, stsc, stsz, stts, ctts, stss, stsd, subs;
	var chunk_run_index, chunk_index, last_chunk_in_run, offset_in_chunk, last_sample_in_chunk;
	var last_sample_in_stts_run, stts_run_index, last_sample_in_ctts_run, ctts_run_index, last_stss_index, last_subs_index;
	for (i = 0; i < this.moov.traks.length; i++) {
		trak = this.moov.traks[i];
		trak.samples = [];
		stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
		stsc = trak.mdia.minf.stbl.stsc;
		stsz = trak.mdia.minf.stbl.stsz;
		stts = trak.mdia.minf.stbl.stts;
		ctts = trak.mdia.minf.stbl.ctts;
		stss = trak.mdia.minf.stbl.stss;
		stsd = trak.mdia.minf.stbl.stsd;
		subs = trak.mdia.minf.stbl.subs;
		
		last_sample_in_stts_run = -1;
		stts_run_index = -1;
		last_sample_in_ctts_run = -1;
		ctts_run_index = -1;
		last_stss_index = 0;
		subs_entry_index = 0;
		last_subs_sample_index = 0;
		/* we build the samples one by one and compute their properties */
		for (j = 0; j < stsz.sample_sizes.length; j++) {
			var sample = {};
			sample.number = j;
			sample.track_id = trak.tkhd.track_id;
			sample.timescale = trak.mdia.mdhd.timescale;
			trak.samples[j] = sample;
			/* size can be known directly */
			sample.size = stsz.sample_sizes[j];

			/* computing chunk-based properties (offset, sample description index)*/
			if (j === 0) {				
				chunk_index = 1; /* the first sample is in the first chunk (chunk indexes are 1-based) */
				chunk_run_index = 0; /* the first chunk is the first entry in the first_chunk table */
				sample.chunk_index = chunk_index;
				sample.chunk_run_index = chunk_run_index;
				last_sample_in_chunk = stsc.samples_per_chunk[chunk_run_index];
				offset_in_chunk = 0;

				/* Is there another entry in the first_chunk table ? */
				if (chunk_run_index + 1 < stsc.first_chunk.length) {
					/* The last chunk in the run is the chunk before the next first chunk */
					last_chunk_in_run = stsc.first_chunk[chunk_run_index+1]-1; 	
				} else {
					/* There is only one entry in the table, it is valid for all future chunks*/
					last_chunk_in_run = Infinity;
				}
			} else {
				if (j < last_sample_in_chunk) {
					/* the sample is still in the current chunk */
					sample.chunk_index = chunk_index;
					sample.chunk_run_index = chunk_run_index;
				} else {
					/* the sample is in the next chunk */
					chunk_index++;
					sample.chunk_index = chunk_index;
					/* reset the accumulated offset in the chunk */
					offset_in_chunk = 0;
					if (chunk_index <= last_chunk_in_run) {
						/* stay in the same entry of the first_chunk table */
						/* chunk_run_index unmodified */
					} else {
						chunk_run_index++;
						/* Is there another entry in the first_chunk table ? */
						if (chunk_run_index + 1 < stsc.first_chunk.length) {
							/* The last chunk in the run is the chunk before the next first chunk */
							last_chunk_in_run = stsc.first_chunk[chunk_run_index+1]-1; 	
						} else {
							/* There is only one entry in the table, it is valid for all future chunks*/
							last_chunk_in_run = Infinity;
						}
						
					}
					sample.chunk_run_index = chunk_run_index;
					last_sample_in_chunk += stsc.samples_per_chunk[chunk_run_index];
				}
			}

			sample.description = stsd.entries[stsc.sample_description_index[sample.chunk_run_index]-1];
			sample.offset = stco.chunk_offsets[sample.chunk_index-1] + offset_in_chunk; /* chunk indexes are 1-based */
			offset_in_chunk += sample.size;

			/* setting dts, cts, duration and rap flags */
			if (j > last_sample_in_stts_run) {
				stts_run_index++;
				if (last_sample_in_stts_run < 0) {
					last_sample_in_stts_run = 0;
				}
				last_sample_in_stts_run += stts.sample_counts[stts_run_index];				
			}
			if (j > 0) {
				trak.samples[j-1].duration = stts.sample_deltas[stts_run_index];
				sample.dts = trak.samples[j-1].dts + trak.samples[j-1].duration;
			} else {
				sample.dts = 0;
			}
			if (ctts) {
				if (j >= last_sample_in_ctts_run) {
					ctts_run_index++;
					if (last_sample_in_ctts_run < 0) {
						last_sample_in_ctts_run = 0;
					}
					last_sample_in_ctts_run += ctts.sample_counts[ctts_run_index];				
				}
				sample.cts = trak.samples[j].dts + ctts.sample_offsets[ctts_run_index];
			} else {
				sample.cts = sample.dts;
			}
			if (stss) {
				if (j == stss.sample_numbers[last_stss_index] - 1) { // sample numbers are 1-based
					sample.is_rap = true;
					last_stss_index++;
				} else {
					sample.is_rap = false;				
				}
			} else {
				sample.is_rap = true;
			}
			if (subs) {
				if (subs.samples[subs_entry_index].sample_delta + last_subs_sample_index == j) {
					sample.subsamples = subs.samples[subs_entry_index].subsamples;
					last_subs_sample_index += subs.samples[subs_entry_index].sample_delta;
				}
			}
		}
		if (j>0) trak.samples[j-1].duration = trak.mdia.mdhd.duration - trak.samples[j-1].dts;
	}
}

/* Update sample list when new 'moof' boxes are received */
ISOFile.prototype.updateSampleLists = function() {	
	var i, j, k;
	var default_sample_description_index, default_sample_duration, default_sample_size, default_sample_flags;
	var last_run_position;
	var box, moof, traf, trak, trex;
	var sample;
	
	if (this.moov === undefined) {
		return;
	}
	/* if the input file is fragmented and fetched in multiple downloads, we need to update the list of samples */
	while (this.lastMoofIndex < this.moofs.length) {
		box = this.moofs[this.lastMoofIndex];
		this.lastMoofIndex++;
		if (box.type == "moof") {
			moof = box;
			for (i = 0; i < moof.trafs.length; i++) {
				traf = moof.trafs[i];
				trak = this.getTrackById(traf.tfhd.track_id);
				trex = this.getTrexById(traf.tfhd.track_id);
				if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC) {
					default_sample_description_index = traf.tfhd.default_sample_description_index;
				} else {
					default_sample_description_index = trex.default_sample_description_index;
				}
				if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR) {
					default_sample_duration = traf.tfhd.default_sample_duration;
				} else {
					default_sample_duration = trex.default_sample_duration;
				}
				if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE) {
					default_sample_size = traf.tfhd.default_sample_size;
				} else {
					default_sample_size = trex.default_sample_size;
				}
				if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS) {
					default_sample_flags = traf.tfhd.default_sample_flags;
				} else {
					default_sample_flags = trex.default_sample_flags;
				}
				for (j = 0; j < traf.truns.length; j++) {
					var trun = traf.truns[j];
					for (k = 0; k < trun.sample_count; k++) {
						sample = {};
						traf.first_sample_index = trak.samples.length;
						trak.samples.push(sample);
						sample.track_id = trak.tkhd.track_id;
						sample.timescale = trak.mdia.mdhd.timescale;
						sample.description = trak.mdia.minf.stbl.stsd.entries[default_sample_description_index-1];
						sample.size = default_sample_size;
						if (trun.flags & BoxParser.TRUN_FLAGS_SIZE) {
							sample.size = trun.sample_size[k];
						}
						sample.duration = default_sample_duration;
						if (trun.flags & BoxParser.TRUN_FLAGS_DURATION) {
							sample.duration = trun.sample_duration[k];
						}
						if (trak.first_traf_merged || k > 0) {
							sample.dts = trak.samples[trak.samples.length-2].dts+trak.samples[trak.samples.length-2].duration;
						} else {
							if (traf.tfdt) {
								sample.dts = traf.tfdt.baseMediaDecodeTime;
							} else {
								sample.dts = 0;
							}
							trak.first_traf_merged = true;
						}
						sample.cts = sample.dts;
						if (trun.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET) {
							sample.cts = sample.dts + trun.sample_composition_time_offset[k];
						}
						sample_flags = default_sample_flags;
						if (trun.flags & BoxParser.TRUN_FLAGS_FLAGS) {
							sample_flags = trun.sample_flags[k];
						} else if (k === 0 && (trun.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG)) {
							sample_flags = trun.first_sample_flags;
						}
						sample.is_rap = ((sample_flags >> 16 & 0x1) ? false : true);
						var bdop = (traf.tfhd.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET) ? true : false;
						var dbim = (traf.tfhd.flags & BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF) ? true : false;
						var dop = (trun.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET) ? true : false;
						var bdo = 0;
						if (!bdop) {
							if (!dbim) {
								if (j === 0) { // the first track in the movie fragment
									bdo = moof.fileStart; // the position of the first byte of the enclosing Movie Fragment Box
								} else {
									bdo = last_run_position; // end of the data defined by the preceding *track* (irrespective of the track id) fragment in the moof
								}
							} else {
								bdo = moof.fileStart;
							}
						} else {
							bdo = traf.tfhd.base_data_offset;
						}
						if (j === 0 && k === 0) {
							if (dop) {
								sample.offset = bdo + trun.data_offset; // If the data-offset is present, it is relative to the base-data-offset established in the track fragment header
							} else {
								sample.offset = bdo; // the data for this run starts the base-data-offset defined by the track fragment header
							}
						} else {
							sample.offset = last_run_position; // this run starts immediately after the data of the previous run
						}
						last_run_position = sample.offset + sample.size;
					}
				}
				if (traf.subs) {
					var sample_index = traf.first_sample_index;
					for (j = 0; j < traf.subs.samples.length; j++) {
						sample_index += traf.subs.samples[j].sample_delta;
						sample = trak.samples[sample_index-1];
						sample.subsamples = traf.subs.samples[j].subsamples;
					}					
				}
			}
		}
	}	
}

/* Builds the MIME Type 'codecs' sub-parameters for the whole file */
ISOFile.prototype.getCodecs = function() {	
	var i;
	var codecs = "";
	for (i = 0; i < this.moov.traks.length; i++) {
		var trak = this.moov.traks[i];
		if (i>0) {
			codecs+=","; 
		}
		codecs += trak.mdia.minf.stbl.stsd.entries[0].getCodec();		
	}
	return codecs;
}

/* Helper function */
ISOFile.prototype.getTrexById = function(id) {	
	var i;
	if (!this.moov || !this.moov.mvex) return null;
	for (i = 0; i < this.moov.mvex.trexs.length; i++) {
		var trex = this.moov.mvex.trexs[i];
		if (trex.track_id == id) return trex;
	}
	return null;
}

/* Helper function */
ISOFile.prototype.getTrackById = function(id) {
	if (this.moov === undefined) {
		return null;
	}
	for (var j = 0; j < this.moov.traks.length; j++) {
		var trak = this.moov.traks[j];
		if (trak.tkhd.track_id == id) return trak;
	}
	return null;
}

/* Try to get sample data for a given sample:
   returns null if not found
   returns the same sample if already requested
 */
ISOFile.prototype.getSample = function(trak, sampleNum) {	
	var buffer;
	var i;
	var sample = trak.samples[sampleNum];
	
	if (!this.moov) {
		return null;
	}

	if (!sample.data) {
		/* Not yet fetched */
		sample.data = new Uint8Array(sample.size);
		sample.alreadyRead = 0;
		this.samplesDataSize += sample.size;
		Log.d("ISOFile", "Allocating sample #"+sampleNum+" on track #"+trak.tkhd.track_id+" of size "+sample.size+" (total: "+this.samplesDataSize+")");
	} else if (sample.alreadyRead == sample.size) {
		/* Already fetched entirely */
		return sample;
	}

	/* The sample has only been partially fetched, we need to check in all mdat boxes (e.g. if the input file is fragmented) 
	   and in all mdat buffers (if the input file was not fetched in a single download) */
	for (i = 0; i < this.stream.nextBuffers.length; i++) {
		buffer = this.stream.nextBuffers[i];

		if (sample.offset + sample.alreadyRead >= buffer.fileStart &&
		    sample.offset + sample.alreadyRead <  buffer.fileStart + buffer.byteLength) {
			/* The sample starts in this buffer */
			
			var lengthAfterStart = buffer.byteLength - (sample.offset + sample.alreadyRead - buffer.fileStart);
			if (sample.size - sample.alreadyRead <= lengthAfterStart) {
				/* the (rest of the) sample is entirely contained in this buffer */

				Log.d("ISOFile","Getting sample #"+sampleNum+" data (alreadyRead: "+sample.alreadyRead+" offset: "+
					(sample.offset+sample.alreadyRead - buffer.fileStart)+" size: "+(sample.size - sample.alreadyRead)+")");

				DataStream.memcpy(sample.data.buffer, sample.alreadyRead, 
				                  buffer, sample.offset+sample.alreadyRead - buffer.fileStart, sample.size - sample.alreadyRead);
				sample.alreadyRead = sample.size;

				/* update the number of bytes used in this buffer and check if it needs to be removed */
				buffer.usedBytes += sample.size - sample.alreadyRead;
				if (buffer.usedBytes === buffer.byteLength) {
					this.stream.nextBuffers.splice(i, 1);
					i--;
					/* TODO: check if the DataStream buffer needs to be updated */
				}

				return sample;
			} else {
				/* the sample does not end in this buffer */				
				
				Log.d("ISOFile","Getting sample data (alreadyRead: "+sample.alreadyRead+" offset: "+
					(sample.offset+sample.alreadyRead - buffer.fileStart)+" size: "+lengthAfterStart+")");
				
				DataStream.memcpy(sample.data.buffer, sample.alreadyRead, 
				                  buffer, sample.offset+sample.alreadyRead - buffer.fileStart, lengthAfterStart);
				sample.alreadyRead += lengthAfterStart;

				/* update the number of bytes used in this buffer and check if it needs to be removed */
				buffer.usedBytes += lengthAfterStart;
				if (buffer.usedBytes === buffer.byteLength) {
					this.stream.nextBuffers.splice(i, 1);
					i--;
					/* TODO: check if the DataStream buffer needs to be updated */
				}
			}
		}
	}
	return null;
}

/* Release the memory used to store the data of the sample */
ISOFile.prototype.releaseSample = function(trak, sampleNum) {	
	var sample = trak.samples[sampleNum];
	sample.data = null;
	this.samplesDataSize -= sample.size;
	return sample.size;
}

/* Find and return specific boxes using recursion and early return */
ISOFile.prototype.getBox = function(type) {
  var result = this.getBoxes(type, true);
  return (result.length ? result[0] : null);  
}

ISOFile.prototype.getBoxes = function(type, returnEarly) {
  var result = [];
  ISOFile._sweep.call(this, type, result, returnEarly);
  return result;
}

ISOFile._sweep = function(type, result, returnEarly) {
  if (this.type && this.type == type) result.push(this);
  for (var box in this.boxes) {
    if (result.length && returnEarly) return;
    ISOFile._sweep.call(this.boxes[box], type, result, returnEarly);
  }
}