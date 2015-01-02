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
    notify: undefined,
    subscribe: undefined,
    unsubscribe: undefined,

    supportsCodec: function (mediaKeysString, codec) {
        "use strict";

        var hasWebKit = ("WebKitMediaKeys" in window),
            hasMs = ("MSMediaKeys" in window),
            hasMediaSource = ("MediaKeys" in window),
            hasWebkitGenerateKeyRequest = ('webkitGenerateKeyRequest' in document.createElement('video'));

        if (hasMediaSource) {
            return MediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasWebKit) {
            return WebKitMediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasMs) {
            return MSMediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasWebkitGenerateKeyRequest) {
            // Chrome doesn't currently support a way to check for isTypeSupported, so we are assuming it is
            return true;
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
            hasStd = ("SetMediaKeys" in element),
            hasWebkitGenerateKeyRequest = ('webkitGenerateKeyRequest' in document.createElement('video'));

        if (hasStd) {
            return element.SetMediaKeys(mediaKeys);
        } else if (hasWebKit) {
            return element.WebKitSetMediaKeys(mediaKeys);
        } else if (hasMs) {
            return element.msSetMediaKeys(mediaKeys);
        } else if (hasWebkitGenerateKeyRequest) {
            // Not yet supported by Chrome, and not necessary for the current Widevine implementation
            return true;
        } else {
            this.debug.log("no setmediakeys function in element");
        }
    },

    createSession: function (mediaKeys, mediaCodec, initData, cdmData) {
        if (null !== cdmData) {
            return mediaKeys.createSession(mediaCodec, initData, cdmData);
        }
        return mediaKeys.createSession(mediaCodec, initData);
    },

    getKeySystems: function (protectionData) {
        var self = this,
            _protectionData = protectionData,
            getLAUrl = function (laUrl, keysystem) {
                if (protectionData && protectionData[keysystem] !== undefined) {
                    if (protectionData[keysystem].laUrl !== null && protectionData[keysystem].laUrl !== '') {
                        return protectionData[keysystem].laUrl;
                    }
                }
                return laUrl;
            },
            playreadyGetUpdate = function (event) {
                var decodedChallenge = null,
                    headers = {},
                    headerName,
                    key,
                    headerOverrides,
                    parser = new DOMParser(),
                    xmlDoc,
                    msg,
                    laURL,
                    bytes;

                bytes = new Uint16Array(event.message.buffer);
                msg = String.fromCharCode.apply(null, bytes);
                xmlDoc = parser.parseFromString(msg, "application/xml");
                laURL = event.destinationURL;

                if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                    var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                    if (Challenge) {
                        decodedChallenge = BASE64.decode(Challenge);
                    }
                }
                else {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, can not find Challenge in keyMessage', null));
                }

                var headerNameList = xmlDoc.getElementsByTagName("name");
                var headerValueList = xmlDoc.getElementsByTagName("value");

                if (headerNameList.length != headerValueList.length) {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, invalid header name/value pair in keyMessage', null));
                }

                for (var i = 0; i < headerNameList.length; i++) {
                    headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
                }

                if (this.bearerToken) {
                    headers.push({name: "Authorization", value: this.bearerToken});
                }

                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    if (xhr.status == 200) {
                        self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, {data: new Uint8Array(xhr.response)});
                    } else {
                        self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + '), expected to be 200. readyState is ' + xhr.readyState, null));
                    }
                };
                xhr.onabort = function () {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                };
                xhr.onerror = function () {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                };

                xhr.open('POST', getLAUrl(laURL, "com.microsoft.playready"));
                xhr.responseType = 'arraybuffer';

                headerOverrides = (_protectionData && _protectionData["com.microsoft.playready"]) ? _protectionData["com.microsoft.playready"].headers : null;

                if (headerOverrides) {
                    for (key in headerOverrides) {
                        headers[key] = headerOverrides[key];
                    }
                }

                for (headerName in headers) {
                    if ('authorization' === headerName.toLowerCase()) {
                        xhr.withCredentials = true;
                    }

                    xhr.setRequestHeader(headerName, headers[headerName]);
                }

                xhr.send(decodedChallenge);
            },
            playReadyNeedToAddKeySession = function (initData, keySessions/*, event*/) {
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
            },
            playReadyCdmData = function () {
                if (protectionData && protectionData["com.microsoft.playready"] !== undefined) {
                    if (protectionData["com.microsoft.playready"].cdmData !== null && protectionData["com.microsoft.playready"].cdmData !== '') {

                        var cdmDataArray = [],
                            charCode,
                            cdmData = protectionData["com.microsoft.playready"].cdmData;
                        cdmDataArray.push(239);
                        cdmDataArray.push(187);
                        cdmDataArray.push(191);
                        for (var i = 0, j = cdmData.length; i < j; ++i) {
                            charCode = cdmData.charCodeAt(i);
                            cdmDataArray.push((charCode & 0xFF00) >> 8);
                            cdmDataArray.push(charCode & 0xFF);
                        }

                        return new Uint8Array(cdmDataArray);
                    }
                }
                return null;
            },
            widevineNeedToAddKeySession = function(initData, keySession, event){
                event.target.webkitGenerateKeyRequest("com.widevine.alpha", event.initData);

                return true;
            },
            widevineGetUpdate =  function (event) {
                var xhr = new XMLHttpRequest(),
                    headers = {},
                    key,
                    headerOverrides,
                    headerName;

                xhr.open("POST", getLAUrl("", "com.widevine.alpha"), true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    if (this.status == 200) {
                        var key = new Uint8Array(this.response);
                        event.target.webkitAddKey("com.widevine.alpha", key, event.initData, event.sessionId);

                        self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, key);
                    } else {
                        self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR status is "' + xhr.statusText + '" (' + xhr.status + '), expected to be 200. readyState is ' + xhr.readyState));
                    }
                };
                xhr.onabort = function () {
                    self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };
                xhr.onerror = function () {
                    self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };

                headerOverrides = (_protectionData && _protectionData["com.widevine.alpha"]) ? _protectionData["com.widevine.alpha"].headers : null;

                if (headerOverrides) {
                    for (key in headerOverrides) {
                        headers[key] = headerOverrides[key];
                    }
                }

                for (headerName in headers) {
                    if ('authorization' === headerName.toLowerCase()) {
                        xhr.withCredentials = true;
                    }

                    xhr.setRequestHeader(headerName, headers[headerName]);
                }

                xhr.send(event.message);
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
                getUpdate: playreadyGetUpdate,
                cdmData: playReadyCdmData
            },
            {
                schemeIdUri: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
                keysTypeString: "com.widevine.alpha",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();},
                needToAddKeySession: widevineNeedToAddKeySession,
                getInitData: function (/*data*/) {
                    // the cenc element in mpd does not contain initdata
                    return null;},
                getUpdate: widevineGetUpdate,
                cdmData: function() {return null;}
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
                getUpdate: playreadyGetUpdate,
                cdmData: playReadyCdmData
            },
            {
                schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
                keysTypeString: "com.widevine.alpha",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase() && data.value.toLowerCase() === "cenc";},
                needToAddKeySession: widevineNeedToAddKeySession,
                getInitData: function (/*data*/) {
                    // the cenc element in mpd does not contain initdata
                    return null;},
                getUpdate: widevineGetUpdate,
                cdmData: function() {return null;}
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
                getUpdate: function (event) {
                    var bytes, msg;
                    bytes = new Uint16Array(event.message.buffer);
                    msg = String.fromCharCode.apply(null, bytes);
                    return msg;
                },
                cdmData: function() {return null;}
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

    unlistenToNeedKey: function(videoModel, listener) {
        videoModel.unlisten("webkitneedkey", listener);
        videoModel.unlisten("msneedkey", listener);
        videoModel.unlisten("needKey", listener);
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

MediaPlayer.dependencies.ProtectionExtensions.eventList = {
    ENAME_KEY_SYSTEM_UPDATE_COMPLETED: "keySystemUpdateCompleted"
};
