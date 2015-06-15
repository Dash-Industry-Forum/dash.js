/**
  Reads a struct of data from the DataStream. The struct is defined as
  a flat array of [name, type]-pairs. See the example below:

  ds.readStruct([
    'headerTag', 'uint32', // Uint32 in DataStream endianness.
    'headerTag2', 'uint32be', // Big-endian Uint32.
    'headerTag3', 'uint32le', // Little-endian Uint32.
    'array', ['[]', 'uint32', 16], // Uint32Array of length 16.
    'array2Length', 'uint32',
    'array2', ['[]', 'uint32', 'array2Length'] // Uint32Array of length array2Length
  ]);

  The possible values for the type are as follows:

  // Number types

  // Unsuffixed number types use DataStream endianness.
  // To explicitly specify endianness, suffix the type with
  // 'le' for little-endian or 'be' for big-endian,
  // e.g. 'int32be' for big-endian int32.

  'uint8' -- 8-bit unsigned int
  'uint16' -- 16-bit unsigned int
  'uint32' -- 32-bit unsigned int
  'int8' -- 8-bit int
  'int16' -- 16-bit int
  'int32' -- 32-bit int
  'float32' -- 32-bit float
  'float64' -- 64-bit float

  // String types
  'cstring' -- ASCII string terminated by a zero byte.
  'string:N' -- ASCII string of length N.
  'string,CHARSET:N' -- String of byteLength N encoded with given CHARSET.
  'u16string:N' -- UCS-2 string of length N in DataStream endianness.
  'u16stringle:N' -- UCS-2 string of length N in little-endian.
  'u16stringbe:N' -- UCS-2 string of length N in big-endian.

  // Complex types
  [name, type, name_2, type_2, ..., name_N, type_N] -- Struct
  function(dataStream, struct) {} -- Callback function to read and return data.
  {get: function(dataStream, struct) {},
   set: function(dataStream, struct) {}}
  -- Getter/setter functions to read and return data, handy for using the same
     struct definition for reading and writing structs.
  ['[]', type, length] -- Array of given type and length. The length can be either
                        a number, a string that references a previously-read
                        field, or a callback function(struct, dataStream, type){}.
                        If length is '*', reads in as many elements as it can.

  @param {Object} structDefinition Struct definition object.
  @return {Object} The read struct. Null if failed to read struct.
 */
DataStream.prototype.readStruct = function(structDefinition) {
  var struct = {}, t, v, n;
  var p = this.position;
  for (var i=0; i<structDefinition.length; i+=2) {
    t = structDefinition[i+1];
    v = this.readType(t, struct);
    if (v == null) {
      if (this.failurePosition === 0) {
        this.failurePosition = this.position;
      }
      this.position = p;
      return null;
    }
    struct[structDefinition[i]] = v;
  }
  return struct;
};

/**
  Read UCS-2 string of desired length and endianness from the DataStream.

  @param {number} length The length of the string to read.
  @param {boolean} endianness The endianness of the string data in the DataStream.
  @return {string} The read string.
 */
DataStream.prototype.readUCS2String = function(length, endianness) {
  return String.fromCharCode.apply(null, this.readUint16Array(length, endianness));
};


/**
  Reads an object of type t from the DataStream, passing struct as the thus-far
  read struct to possible callbacks that refer to it. Used by readStruct for
  reading in the values, so the type is one of the readStruct types.

  @param {Object} t Type of the object to read.
  @param {?Object} struct Struct to refer to when resolving length references
                          and for calling callbacks.
  @return {?Object} Returns the object on successful read, null on unsuccessful.
 */
DataStream.prototype.readType = function(t, struct) {
  if (typeof t == "function") {
    return t(this, struct);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.get(this, struct);
  } else if (t instanceof Array && t.length != 3) {
    return this.readStruct(t, struct);
  }
  var v = null;
  var lengthOverride = null;
  var charset = "ASCII";
  var pos = this.position;
  var tp;
  var i;
  var u;
  if (typeof t == 'string' && /:/.test(t)) {
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
      v = this.readUint8(); break;
    case 'int8':
      v = this.readInt8(); break;

    case 'uint16':
      v = this.readUint16(this.endianness); break;
    case 'int16':
      v = this.readInt16(this.endianness); break;
    case 'uint32':
      v = this.readUint32(this.endianness); break;
    case 'int32':
      v = this.readInt32(this.endianness); break;
    case 'float32':
      v = this.readFloat32(this.endianness); break;
    case 'float64':
      v = this.readFloat64(this.endianness); break;

    case 'uint16be':
      v = this.readUint16(DataStream.BIG_ENDIAN); break;
    case 'int16be':
      v = this.readInt16(DataStream.BIG_ENDIAN); break;
    case 'uint32be':
      v = this.readUint32(DataStream.BIG_ENDIAN); break;
    case 'int32be':
      v = this.readInt32(DataStream.BIG_ENDIAN); break;
    case 'float32be':
      v = this.readFloat32(DataStream.BIG_ENDIAN); break;
    case 'float64be':
      v = this.readFloat64(DataStream.BIG_ENDIAN); break;

    case 'uint16le':
      v = this.readUint16(DataStream.LITTLE_ENDIAN); break;
    case 'int16le':
      v = this.readInt16(DataStream.LITTLE_ENDIAN); break;
    case 'uint32le':
      v = this.readUint32(DataStream.LITTLE_ENDIAN); break;
    case 'int32le':
      v = this.readInt32(DataStream.LITTLE_ENDIAN); break;
    case 'float32le':
      v = this.readFloat32(DataStream.LITTLE_ENDIAN); break;
    case 'float64le':
      v = this.readFloat64(DataStream.LITTLE_ENDIAN); break;

    case 'cstring':
      v = this.readCString(lengthOverride); break;

    case 'string':
      v = this.readString(lengthOverride, charset); break;

    case 'u16string':
      v = this.readUCS2String(lengthOverride, this.endianness); break;

    case 'u16stringle':
      v = this.readUCS2String(lengthOverride, DataStream.LITTLE_ENDIAN); break;

    case 'u16stringbe':
      v = this.readUCS2String(lengthOverride, DataStream.BIG_ENDIAN); break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        var len = t[2];
        var length = 0;
        if (typeof len == 'function') {
          length = len(struct, this, t);
        } else if (typeof len == 'string' && struct[len] != null) {
          length = parseInt(struct[len]);
        } else {
          length = parseInt(len);
        }
        if (typeof ta == "string") {
          var tap = ta.replace(/(le|be)$/, '');
          var endianness = null;
          if (/le$/.test(ta)) {
            endianness = DataStream.LITTLE_ENDIAN;
          } else if (/be$/.test(ta)) {
            endianness = DataStream.BIG_ENDIAN;
          }
          if (len == '*') {
            length = null;
          }
          switch(tap) {
            case 'uint8':
              v = this.readUint8Array(length); break;
            case 'uint16':
              v = this.readUint16Array(length, endianness); break;
            case 'uint32':
              v = this.readUint32Array(length, endianness); break;
            case 'int8':
              v = this.readInt8Array(length); break;
            case 'int16':
              v = this.readInt16Array(length, endianness); break;
            case 'int32':
              v = this.readInt32Array(length, endianness); break;
            case 'float32':
              v = this.readFloat32Array(length, endianness); break;
            case 'float64':
              v = this.readFloat64Array(length, endianness); break;
            case 'cstring':
            case 'utf16string':
            case 'string':
              if (length == null) {
                v = [];
                while (!this.isEof()) {
                  u = this.readType(ta, struct);
                  if (u == null) break;
                  v.push(u);
                }
              } else {
                v = new Array(length);
                for (i=0; i<length; i++) {
                  v[i] = this.readType(ta, struct);
                }
              }
              break;
          }
        } else {
          if (len == '*') {
            v = [];
            var tmp_buffer = this.buffer;
            while (true) {
              var p = this.position;
              try {
                var o = this.readType(ta, struct);
                if (o == null) {
                  this.position = p;
                  break;
                }
                v.push(o);
              } catch(e) {
                this.position = p;
                break;
              }
            }
          } else {
            v = new Array(length);
            for (i=0; i<length; i++) {
              u = this.readType(ta, struct);
              if (u == null) return null;
              v[i] = u;
            }
          }
        }
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos + lengthOverride;
  }
  return v;
};

