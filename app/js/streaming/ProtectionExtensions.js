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

MediaPlayer.dependencies.ProtectionExtensions = function () {
    "use strict";
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,

    supportsCodec: function (mediaKeysString, codec) {
        "use strict";

        var hasWebKit = ("WebKitMediaKeys" in window),
            hasMs = ("MSMediaKeys" in window),
            hasMediaSource = ("MediaKeys" in window);

        if (hasMediaSource) {
            return MediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasWebKit) {
            return WebKitMediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasMs) {
            return MSMediaKeys.isTypeSupported(mediaKeysString, codec);
        }

        return false;
    },

    createMediaKeys: function (mediaKeysString) {
        "use strict";

        var hasWebKit = ("WebKitMediaKeys" in window),
            hasMs = ("MSMediaKeys" in window),
            hasMediaSource = ("MediaKeys" in window);

        if (hasMediaSource) {
            return new MediaKeys(mediaKeysString);
        } else if (hasWebKit) {
            return new WebKitMediaKeys(mediaKeysString);
        } else if (hasMs) {
            return new MSMediaKeys(mediaKeysString);
        }

        return null;
    },

    setMediaKey: function (element, mediaKeys) {
        var hasWebKit = ("WebKitSetMediaKeys" in element),
            hasMs = ("msSetMediaKeys" in element),
            hasStd = ("SetMediaKeys" in element);

        if (hasStd) {
            return element.SetMediaKeys(mediaKeys);
        } else if (hasWebKit) {
            return element.WebKitSetMediaKeys(mediaKeys);
        } else if (hasMs) {
            return element.msSetMediaKeys(mediaKeys);
        } else {
            this.debug.log("no setmediakeys function in element");
        }
    },

    createSession: function (mediaKeys, mediaCodec, initData) {
        return mediaKeys.createSession(mediaCodec, initData);
    },

    getKeySystems: function () {
        var playreadyGetUpdate = function (msg, laURL) {
                var deferred = Q.defer(),
                    decodedChallenge = null,
                    headers = [],
                    parser = new DOMParser(),
                    xmlDoc = parser.parseFromString(msg, "application/xml");

                if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                    var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                    if (Challenge) {
                        decodedChallenge = BASE64.decode(Challenge);
                    }
                }
                else {
                    deferred.reject('DRM: playready update, can not find Challenge in keyMessage');
                    return deferred.promise;
                }

                var headerNameList = xmlDoc.getElementsByTagName("name");
                var headerValueList = xmlDoc.getElementsByTagName("value");

                if (headerNameList.length != headerValueList.length) {
                    deferred.reject('DRM: playready update, invalid header name/value pair in keyMessage');
                    return deferred.promise;
                }

                for (var i = 0; i < headerNameList.length; i++) {
                    headers[i] = {
                        name: headerNameList[i].childNodes[0].nodeValue,
                        value: headerValueList[i].childNodes[0].nodeValue
                    };
                }

                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    if (xhr.status == 200) {
                        deferred.resolve(new Uint8Array(xhr.response));
                    } else {
                        deferred.reject('DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + '), expected to be 200. readyState is ' + xhr.readyState);
                    }
                };
                xhr.onabort = function () {
                    deferred.reject('DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState);
                };
                xhr.onerror = function () {
                    deferred.reject('DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState);
                };

                xhr.open('POST', laURL);
                xhr.responseType = 'arraybuffer';
                if (headers) {
                    headers.forEach(function(hdr) {
                        xhr.setRequestHeader(hdr.name, hdr.value);
                    });
                }
                xhr.send(decodedChallenge);

                return deferred.promise;
            },
            playReadyNeedToAddKeySession = function (initData, keySessions) {
                return initData === null && keySessions.length === 0;
            },
            playreadyGetInitData = function (data) {
                    // * desc@ getInitData
                    // *   generate PSSH data from PROHeader defined in MPD file
                    // *   PSSH format:
                    // *   size (4)
                    // *   box type(PSSH) (8)
                    // *   Protection SystemID (16)
                    // *   protection system data size (4) - length of decoded PROHeader
                    // *   decoded PROHeader data from MPD file  
                    var byteCursor = 0,
                        PROSize = 0,
                        PSSHSize = 0,
                        PSSHBoxType =  new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00 ]), //'PSSH' 8 bytes
                        playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]),
                        uint8arraydecodedPROHeader = null,
                        PSSHBoxBuffer = null,
                        PSSHBox = null,
                        PSSHData = null;

                    if ("pro" in data) {
                        uint8arraydecodedPROHeader = BASE64.decodeArray(data.pro.__text);
                    }
                    else if ("prheader" in data) {
                        uint8arraydecodedPROHeader = BASE64.decodeArray(data.prheader.__text);
                    }
                    else {
                        return null;
                    }

                    PROSize = uint8arraydecodedPROHeader.length;
                    PSSHSize = 0x4 + PSSHBoxType.length + playreadySystemID.length + 0x4 + PROSize;

                    PSSHBoxBuffer = new ArrayBuffer(PSSHSize);

                    PSSHBox = new Uint8Array(PSSHBoxBuffer);
                    PSSHData = new DataView(PSSHBoxBuffer);

                    PSSHData.setUint32(byteCursor, PSSHSize);
                    byteCursor += 0x4;

                    PSSHBox.set(PSSHBoxType, byteCursor);
                    byteCursor += PSSHBoxType.length;

                    PSSHBox.set(playreadySystemID, byteCursor);
                    byteCursor += playreadySystemID.length;

                    PSSHData.setUint32(byteCursor, PROSize);
                    byteCursor += 0x4;

                    PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
                    byteCursor += PROSize;

                    return PSSHBox;
            };

        //
        // order by priority. if an mpd contains more than one the first match will win.
        // Entries with the same schemeIdUri can appear multiple times with different keysTypeStrings.
        //
        return [
            {
                schemeIdUri: "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95",
                keysTypeString: "com.microsoft.playready",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();},
                needToAddKeySession: playReadyNeedToAddKeySession,
                getInitData: playreadyGetInitData,
                getUpdate: playreadyGetUpdate
            },
            {
                schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
                keysTypeString: "com.microsoft.playready",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase() && data.value.toLowerCase() === "cenc";},
                needToAddKeySession: playReadyNeedToAddKeySession,
                getInitData: function (/*data*/) {
                    // the cenc element in mpd does not contain initdata
                    return null;},
                getUpdate: playreadyGetUpdate
            },
            {
                schemeIdUri: "urn:uuid:00000000-0000-0000-0000-000000000000",
                keysTypeString: "webkit-org.w3.clearkey",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();},
                needToAddKeySession: function (/*initData, keySessions*/) {
                    return true;},
                getInitData: function (/*data*/) {
                    return null;},
                getUpdate: function (msg/*, laURL*/) {
                    return Q.when(msg);
                }
            }
        ];
    },

    addKey: function (element, type, key, data, id) {
        element.webkitAddKey(type, key, data, id);
    },

    generateKeyRequest: function(element, type, data) {
        element.webkitGenerateKeyRequest(type, data);
    },

    listenToNeedKey: function(videoModel, listener) {
        videoModel.listen("webkitneedkey", listener);
        videoModel.listen("msneedkey", listener);
        videoModel.listen("needKey", listener);
    },

    listenToKeyError: function(source, listener) {
        source.addEventListener("webkitkeyerror", listener, false);
        source.addEventListener("mskeyerror", listener, false);
        source.addEventListener("keyerror", listener, false);
    },

    listenToKeyMessage: function(source, listener) {
        source.addEventListener("webkitkeymessage", listener, false);
        source.addEventListener("mskeymessage", listener, false);
        source.addEventListener("keymessage", listener, false);
    },

    listenToKeyAdded: function(source, listener) {
        source.addEventListener("webkitkeyadded", listener, false);
        source.addEventListener("mskeyadded", listener, false);
        source.addEventListener("keyadded", listener, false);
    },

    unlistenToKeyError: function(source, listener) {
        source.removeEventListener("webkitkeyerror", listener);
        source.removeEventListener("mskeyerror", listener);
        source.removeEventListener("keyerror", listener);
    },

    unlistenToKeyMessage: function(source, listener) {
        source.removeEventListener("webkitkeymessage", listener);
        source.removeEventListener("mskeymessage", listener);
        source.removeEventListener("keymessage", listener);
    },

    unlistenToKeyAdded: function(source, listener) {
        source.removeEventListener("webkitkeyadded", listener);
        source.removeEventListener("mskeyadded", listener);
        source.removeEventListener("keyadded", listener);
    }

};