/**
  Saves the DataStream contents to the given filename.
  Uses Chrome's anchor download property to initiate download.
 
  @param {string} filename Filename to save as.
  @return {null}
  */
DataStream.prototype.save = function(filename) {
  var blob = new Blob([this.buffer]);
  var URL = (window.webkitURL || window.URL);
  if (URL && URL.createObjectURL) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      a.click();
      URL.revokeObjectURL(url);
  } else {
      throw("DataStream.save: Can't create object URL.");
  }
};

/**
  Whether to extend DataStream buffer when trying to write beyond its size.
  If set, the buffer is reallocated to twice its current size until the
  requested write fits the buffer.
  @type {boolean}
  */
DataStream.prototype._dynamicSize = true;
Object.defineProperty(DataStream.prototype, 'dynamicSize',
  { get: function() {
      return this._dynamicSize;
    },
    set: function(v) {
      if (!v) {
        this._trimAlloc();
      }
      this._dynamicSize = v;
    } });

/**
  Internal function to trim the DataStream buffer when required.
  Used for stripping out the first bytes when not needed anymore.

  @return {null}
  */
DataStream.prototype.shift = function(offset) {
  var buf = new ArrayBuffer(this._byteLength-offset);
  var dst = new Uint8Array(buf);
  var src = new Uint8Array(this._buffer, offset, dst.length);
  dst.set(src);
  this.buffer = buf;
  this.position -= offset;
};

/**
  Writes an Int32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeInt32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Int32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt32(arr[i], e);
    }
  }
};

/**
  Writes an Int16Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeInt16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  if (arr instanceof Int16Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt16Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt16(arr[i], e);
    }
  }
};

/**
  Writes an Int8Array to the DataStream.

  @param {Object} arr The array to write.
 */
DataStream.prototype.writeInt8Array = function(arr) {
  this._realloc(arr.length * 1);
  if (arr instanceof Int8Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt8Array(arr.length);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt8(arr[i]);
    }
  }
};

/**
  Writes a Uint32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeUint32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Uint32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint32(arr[i], e);
    }
  }
};

/**
  Writes a Uint16Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeUint16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  if (arr instanceof Uint16Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint16Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint16(arr[i], e);
    }
  }
};

/**
  Writes a Uint8Array to the DataStream.

  @param {Object} arr The array to write.
 */
DataStream.prototype.writeUint8Array = function(arr) {
  this._realloc(arr.length * 1);
  if (arr instanceof Uint8Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint8Array(arr.length);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint8(arr[i]);
    }
  }
};

/**
  Writes a Float64Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeFloat64Array = function(arr, e) {
  this._realloc(arr.length * 8);
  if (arr instanceof Float64Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapFloat64Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeFloat64(arr[i], e);
    }
  }
};

/**
  Writes a Float32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeFloat32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Float32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapFloat32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeFloat32(arr[i], e);
    }
  }
};


/**
  Writes a 32-bit int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeInt32 = function(v, e) {
  this._realloc(4);
  this._dataView.setInt32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 16-bit int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeInt16 = function(v, e) {
  this._realloc(2);
  this._dataView.setInt16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

/**
  Writes an 8-bit int to the DataStream.

  @param {number} v Number to write.
 */
DataStream.prototype.writeInt8 = function(v) {
  this._realloc(1);
  this._dataView.setInt8(this.position, v);
  this.position += 1;
};

/**
  Writes a 32-bit unsigned int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeUint32 = function(v, e) {
  this._realloc(4);
  this._dataView.setUint32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 16-bit unsigned int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeUint16 = function(v, e) {
  this._realloc(2);
  this._dataView.setUint16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

/**
  Writes an 8-bit unsigned  int to the DataStream.

  @param {number} v Number to write.
 */
DataStream.prototype.writeUint8 = function(v) {
  this._realloc(1);
  this._dataView.setUint8(this.position, v);
  this.position += 1;
};

/**
  Writes a 32-bit float to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeFloat32 = function(v, e) {
  this._realloc(4);
  this._dataView.setFloat32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 64-bit float to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeFloat64 = function(v, e) {
  this._realloc(8);
  this._dataView.setFloat64(this.position, v, e == null ? this.endianness : e);
  this.position += 8;
};

/**
  Write a UCS-2 string of desired endianness to the DataStream. The
  lengthOverride argument lets you define the number of characters to write.
  If the string is shorter than lengthOverride, the extra space is padded with
  zeroes.

  @param {string} str The string to write.
  @param {?boolean} endianness The endianness to use for the written string data.
  @param {?number} lengthOverride The number of characters to write.
 */
DataStream.prototype.writeUCS2String = function(str, endianness, lengthOverride) {
  if (lengthOverride == null) {
    lengthOverride = str.length;
  }
  for (var i = 0; i < str.length && i < lengthOverride; i++) {
    this.writeUint16(str.charCodeAt(i), endianness);
  }
  for (; i<lengthOverride; i++) {
    this.writeUint16(0);
  }
};

/**
  Writes a string of desired length and encoding to the DataStream.

  @param {string} s The string to write.
  @param {?string} encoding The encoding for the written string data.
                            Defaults to ASCII.
  @param {?number} length The number of characters to write.
 */
DataStream.prototype.writeString = function(s, encoding, length) {
  var i = 0;
  if (encoding == null || encoding == "ASCII") {
    if (length != null) {
      var len = Math.min(s.length, length);
      for (i=0; i<len; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
      for (; i<length; i++) {
        this.writeUint8(0);
      }
    } else {
      for (i=0; i<s.length; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
    }
  } else {
    this.writeUint8Array((new TextEncoder(encoding)).encode(s.substring(0, length)));
  }
};

/**
  Writes a null-terminated string to DataStream and zero-pads it to length
  bytes. If length is not given, writes the string followed by a zero.
  If string is longer than length, the written part of the string does not have
  a trailing zero.

  @param {string} s The string to write.
  @param {?number} length The number of characters to write.
 */
DataStream.prototype.writeCString = function(s, length) {
  var i = 0;
  if (length != null) {
    var len = Math.min(s.length, length);
    for (i=0; i<len; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    for (; i<length; i++) {
      this.writeUint8(0);
    }
  } else {
    for (i=0; i<s.length; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    this.writeUint8(0);
  }
};

/**
  Writes a struct to the DataStream. Takes a structDefinition that gives the
  types and a struct object that gives the values. Refer to readStruct for the
  structure of structDefinition.

  @param {Object} structDefinition Type definition of the struct.
  @param {Object} struct The struct data object.
  */
DataStream.prototype.writeStruct = function(structDefinition, struct) {
  for (var i = 0; i < structDefinition.length; i+=2) {
    var t = structDefinition[i+1];
    this.writeType(t, struct[structDefinition[i]], struct);
  }
};

/**
  Writes object v of type t to the DataStream.

  @param {Object} t Type of data to write.
  @param {Object} v Value of data to write.
  @param {Object} struct Struct to pass to write callback functions.
  */
DataStream.prototype.writeType = function(t, v, struct) {
  var tp;
  if (typeof t == "function") {
    return t(this, v);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.set(this, v, struct);
  }
  var lengthOverride = null;
  var charset = "ASCII";
  var pos = this.position;
  if (typeof(t) == 'string' && /:/.test(t)) {
    tp = t.split(":");
    t = tp[0];
    lengthOverride = parseInt(tp[1]);
  }
  if (typeof t == 'string' && /,/.test(t)) {
    tp = t.split(",");
    t = tp[0];
    charset = parseInt(tp[1]);
  }

  switch(t) {
    case 'uint8':
      this.writeUint8(v);
      break;
    case 'int8':
      this.writeInt8(v);
      break;

    case 'uint16':
      this.writeUint16(v, this.endianness);
      break;
    case 'int16':
      this.writeInt16(v, this.endianness);
      break;
    case 'uint32':
      this.writeUint32(v, this.endianness);
      break;
    case 'int32':
      this.writeInt32(v, this.endianness);
      break;
    case 'float32':
      this.writeFloat32(v, this.endianness);
      break;
    case 'float64':
      this.writeFloat64(v, this.endianness);
      break;

    case 'uint16be':
      this.writeUint16(v, DataStream.BIG_ENDIAN);
      break;
    case 'int16be':
      this.writeInt16(v, DataStream.BIG_ENDIAN);
      break;
    case 'uint32be':
      this.writeUint32(v, DataStream.BIG_ENDIAN);
      break;
    case 'int32be':
      this.writeInt32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float32be':
      this.writeFloat32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float64be':
      this.writeFloat64(v, DataStream.BIG_ENDIAN);
      break;

    case 'uint16le':
      this.writeUint16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int16le':
      this.writeInt16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'uint32le':
      this.writeUint32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int32le':
      this.writeInt32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float32le':
      this.writeFloat32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float64le':
      this.writeFloat64(v, DataStream.LITTLE_ENDIAN);
      break;

    case 'cstring':
      this.writeCString(v, lengthOverride);
      break;

    case 'string':
      this.writeString(v, charset, lengthOverride);
      break;

    case 'u16string':
      this.writeUCS2String(v, this.endianness, lengthOverride);
      break;

    case 'u16stringle':
      this.writeUCS2String(v, DataStream.LITTLE_ENDIAN, lengthOverride);
      break;

    case 'u16stringbe':
      this.writeUCS2String(v, DataStream.BIG_ENDIAN, lengthOverride);
      break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        for (var i=0; i<v.length; i++) {
          this.writeType(ta, v[i]);
        }
        break;
      } else {
        this.writeStruct(t, v);
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos;
    this._realloc(lengthOverride);
    this.position = pos + lengthOverride;
  }
};


DataStream.prototype.writeUint64 = function (v) {
	var h = Math.floor(v / MAX_SIZE);
	this.writeUint32(h);
	this.writeUint32(v & 0xFFFFFFFF);
}

DataStream.prototype.writeUint24 = function (v) {
	this.writeUint8((v & 0x00FF0000)>>16);
	this.writeUint8((v & 0x0000FF00)>>8);
	this.writeUint8((v & 0x000000FF));
}

DataStream.prototype.adjustUint32 = function(position, value) {
	var pos = this.position;
	this.seek(position);
	this.writeUint32(value);
	this.seek(pos);
}