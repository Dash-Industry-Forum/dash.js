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
    stringMethods: undefined,

    supportsCodec: function (mediaKeysString, codec) {
        "use strict";

        var hasWebKit = ("WebKitMediaKeys" in window),
            hasMs = ("MSMediaKeys" in window),
            hasMediaSource = ("MediaKeys" in window),
            hasWebkitGenerateKeyRequest = ('webkitGenerateKeyRequest' in document.createElement('video'));

        if (hasWebkitGenerateKeyRequest) {
            return 'com.widevine.alpha' === mediaKeysString;
        } else if (hasMediaSource) {
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
            hasMediaSource = ("MediaKeys" in window),
            hasWebkitGenerateKeyRequest = ('webkitGenerateKeyRequest' in document.createElement('video'));

        if (hasWebkitGenerateKeyRequest) {
            return {
                keySystem: mediaKeysString
            };
        }
        if (hasMediaSource) {
            return new MediaKeys(mediaKeysString);
        } else if (hasWebKit) {
            return new WebKitMediaKeys(mediaKeysString);
        } else if (hasMs) {
            return new MSMediaKeys(mediaKeysString);
        }

        return null;
    },

    setMediaKey: function (element, mediaKeys, initData) {
        var hasWebKit = ("WebKitSetMediaKeys" in element),
            hasMs = ("msSetMediaKeys" in element),
            hasSetMediaKeys = ("SetMediaKeys" in element),
            hasCamelCaseSetMediaKeys = ("setMediaKeys" in element),
            hasWebkitGenerateKeyRequest = ("webkitGenerateKeyRequest" in element);

        if (hasWebkitGenerateKeyRequest) {
            return element.webkitGenerateKeyRequest(mediaKeys.keySystem, initData);
        } else if (hasSetMediaKeys) {
            return element.SetMediaKeys(mediaKeys);
        } else if (hasCamelCaseSetMediaKeys) {
            return element.setMediaKeys(mediaKeys);
        } else if (hasWebKit) {
            return element.WebKitSetMediaKeys(mediaKeys);
        } else if (hasMs) {
            return element.msSetMediaKeys(mediaKeys);
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
            _stringUtils = self.stringMethods,
            _protectionData = {
                licenseRequest: {
                    'com.microsoft.playready': {
                        cdmData: null,
                        laUrl: null,
                        headers: null
                    },
                    'com.widevine.alpha': {
                        cdmData: null,
                        laUrl: null,
                        headers: null
                    }
                }
            },
            getUpdate = function (event, keySystem, laUrl, headers, message) {
                var xhr = new XMLHttpRequest();

                xhr.open('POST', laUrl, true);
                xhr.responseType = 'arraybuffer';

                xhr.onload = function () {
                    if (xhr.status == 200) {
                        var key = new Uint8Array(xhr.response);

                        if ('com.widevine.alpha' === keySystem) {
                            event.target.webkitAddKey(keySystem, key, event.initData, event.sessionId);
                        }

                        self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, { data: key });
                    } else {
                        self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: ' + keySystem + ' update, XHR status is "' + xhr.statusText + '" (' + xhr.status + '), expected to be 200. readyState is ' + xhr.readyState, null));
                        return;
                    }
                };

                xhr.onabort = function () {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: ' + keySystem + ' update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                };
                xhr.onerror = function () {
                    self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: ' + keySystem + ' update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                };

                var key,
                        headerOverrides = (_protectionData.licenseRequest && _protectionData.licenseRequest[keySystem]) ? _protectionData.licenseRequest && _protectionData.licenseRequest[keySystem].headers : null;
                if (headerOverrides) {
                    headers = headers || {};
                    for (key in headerOverrides) {
                        headers[key] = headerOverrides[key];
                    }
                }

                if (headers) {
                    for (key in headers) {
                        if ('authorization' === key.toLowerCase()) {
                            xhr.withCredentials = true;
                        }

                        xhr.setRequestHeader(key, headers[key]);
                    }
                }

                xhr.send(message || event.message);
            },
            playreadyGetUpdate = function (event, laUrl) {
                var message = null,
                    headers = {},
                    parser = new DOMParser(),
                    xmlDoc = parser.parseFromString(String.fromCharCode.apply(null, new Uint16Array(event.message.buffer)), "application/xml");

                if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                    var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                    if (Challenge) {
                        message = BASE64.decode(Challenge);
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
                    headers.Authorization = this.bearerToken;
                }

                getUpdate(event, 'com.microsoft.playready', laUrl, headers, message);
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
            },
            laUrl = function (laUrl) {
                if (!_stringUtils.isNullOrEmpty(laUrl)) {
                    _protectionData.licenseRequest[this.keysTypeString].laUrl = laUrl;
                }

                return _protectionData.licenseRequest[this.keysTypeString].laUrl;
            },
            cdmData = function (cdmData) {
                if (!_stringUtils.isNullOrEmpty(cdmData)) {
                    _protectionData.licenseRequest[this.keysTypeString].cdmData = cdmData;
                }

                return _protectionData.licenseRequest[this.keysTypeString].cdmData;
            },
            playReadyCdmData = function (cdmData) {
                if (!_stringUtils.isNullOrEmpty(cdmData)) {
                    _protectionData.licenseRequest[this.keysTypeString].cdmData = cdmData;
                }

                var _cdmData = _protectionData.licenseRequest[this.keysTypeString].cdmData;
                if (null === _cdmData) {
                    return null;
                }

                var cdmDataArray = [], charCode;
                cdmDataArray.push(239);
                cdmDataArray.push(187);
                cdmDataArray.push(191);
                for(var i = 0, j = _cdmData.length; i < j; ++i){
                    charCode = _cdmData.charCodeAt(i);
                    cdmDataArray.push((charCode & 0xFF00) >> 8);
                    cdmDataArray.push(charCode & 0xFF);
                }

                return new Uint8Array(cdmDataArray);
            };

        if ('undefined' !== typeof (protectionData) && null !== protectionData) {
            _protectionData.licenseRequest = protectionData.licenseRequest || _protectionData.licenseRequest;
        }

        //
        // order by priority. if an mpd contains more than one the first match will win.
        // Entries with the same schemeIdUri can appear multiple times with different keysTypeStrings.
        //
        return [
            {
                schemeIdUri: "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95",
                keysTypeString: "com.microsoft.playready",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();
                },
                needToAddKeySession: playReadyNeedToAddKeySession,
                getInitData: playreadyGetInitData,
                getUpdate: playreadyGetUpdate,
                laUrl: laUrl,
                cdmData: playReadyCdmData
            },
            {
                schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
                keysTypeString: "com.microsoft.playready",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase() && data.value.toLowerCase() === "cenc";
                },
                needToAddKeySession: playReadyNeedToAddKeySession,
                getInitData: function (/*data*/) {
                    // the cenc element in mpd does not contain initdata
                    return null;
                },
                getUpdate: playreadyGetUpdate,
                laUrl: laUrl,
                cdmData: playReadyCdmData
            },
            {
                schemeIdUri: "urn:uuid:00000000-0000-0000-0000-000000000000",
                keysTypeString: "webkit-org.w3.clearkey",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();
                },
                needToAddKeySession: function (/*initData, keySessions*/) {
                    return true;
                },
                getInitData: function (/*data*/) {
                    return null;
                },
                getUpdate: function (event, laUrl) {
                    //jshint unused:false
                    return event.message;
                },
                laUrl: laUrl,
                cdmData: cdmData
            },
            {
                schemeIdUri: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
                keysTypeString: "com.widevine.alpha",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase();
                },
                needToAddKeySession: function (/*initData, keySessions*/) {
                    return false;
                },
                getInitData: function (/*data*/) {
                    return null;
                },
                getUpdate: function (event, laUrl) {
                    getUpdate(event, 'com.widevine.alpha', laUrl);
                },
                laUrl: laUrl,
                cdmData: cdmData
            },
            {
                schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
                keysTypeString: "com.widevine.alpha",
                isSupported: function (data) {
                    return this.schemeIdUri === data.schemeIdUri.toLowerCase() && data.value.toLowerCase() === "cenc";
                },
                needToAddKeySession: function (/*initData, keySessions*/) {
                    return false;
                },
                getInitData: function (/*data*/) {
                    // the cenc element in mpd does not contain initdata
                    return null;
                },
                getUpdate: function (event, laUrl) {
                    getUpdate(event, 'com.widevine.alpha', laUrl);
                },
                laUrl: laUrl,
                cdmData: cdmData
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

    listenToVideoModelKeyMessage: function (videoModel, listener) {
        videoModel.listen("webkitkeymessage", listener);
        videoModel.listen("mskeymessage", listener);
        videoModel.listen("keymessage", listener);
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

    unlistenToVideoModelKeyMessage: function (videoModel, listener) {
        videoModel.unlisten("webkitkeymessage", listener);
        videoModel.unlisten("mskeymessage", listener);
        videoModel.unlisten("keymessage", listener);
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