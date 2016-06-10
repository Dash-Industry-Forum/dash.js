'use strict';

angular.module('DashSourcesService', ['ngResource']).
    factory('Sources', function($resource){
        return $resource('app/sources.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashNotesService', ['ngResource']).
    factory('Notes', function($resource){
        return $resource('app/notes.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashContributorsService', ['ngResource']).
    factory('Contributors', function($resource){
        return $resource('app/contributors.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashPlayerLibrariesService', ['ngResource']).
    factory('PlayerLibraries', function($resource){
        return $resource('app/player_libraries.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashShowcaseLibrariesService', ['ngResource']).
    factory('ShowcaseLibraries', function($resource){
        return $resource('app/showcase_libraries.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

var app = angular.module('DashPlayer', [
    'DashSourcesService',
    'DashNotesService',
    'DashContributorsService',
    'DashPlayerLibrariesService',
    'DashShowcaseLibrariesService'
]);

app.controller('DashController', function($scope, Sources, Notes, Contributors, PlayerLibraries, ShowcaseLibraries) {
    var player,
        video,
        controlbar,
        context;

    $scope.drmData = [];

    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest')
            this.$eval(fn);
        else
            this.$apply(fn);
    };

    ////////////////////////////////////////
    //
    // Error Handling
    //
    ////////////////////////////////////////

    function onError(e) {

    }

    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    video = document.querySelector(".dash-video-player video");
    player = dashjs.MediaPlayer().create();
    player.initialize(video, null, true);
    player.on(dashjs.MediaPlayer.events.ERROR, onError.bind(this));
    player.attachVideoContainer(document.getElementById("videoContainer"));
    controlbar = new ControlBar(player, video);
    controlbar.initialize();
    controlbar.disable();
    $scope.version = player.getVersion();

    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }

    // Get url params...
    var vars = getUrlVars();

    Sources.query(function (data) {
        $scope.availableStreams = data.items;
    });

    Notes.query(function (data) {
        $scope.releaseNotes = data.notes;
    });

    Contributors.query(function (data) {
        $scope.contributors = data.items;
    });

    PlayerLibraries.query(function (data) {
        $scope.playerLibraries = data.items;
    });

    ShowcaseLibraries.query(function (data) {
        $scope.showcaseLibraries = data.items;
    });

    $scope.setStream = function (item) {
        $scope.selectedItem = item;
    };

    $scope.doLoad = function () {
        var protectionData = null;
        if ($scope.selectedItem.hasOwnProperty("protData")) {
            protectionData = $scope.selectedItem.protData;
        }
        player.setProtectionData(protectionData);
        player.attachSource($scope.selectedItem.url);
        player.setAutoSwitchQuality($scope.abrEnabled);
        controlbar.reset();
        controlbar.enable();
    };

    $scope.getLoadedMessage = function(session) {
        if (session.sessionToken.getSessionType() === "temporary")
            return "Temporary (Not Persistent)";
        return (session.isLoaded) ? "Loaded" : "Not Loaded";
    };

    $scope.isLoaded = function(session) {
        return session.isLoaded || session.sessionToken.getSessionType() === "temporary";
    };

    $scope.arrayToCommaSeparated = function(ar) {
        var retVal = "";
        if (ar) {
            for (var i = 0; i < ar.length; i++) {
                retVal += ar[i] + ", ";
            }
            retVal = retVal.slice(0, -2); // strip trailing ', '
        }
        return retVal;
    };

    var addDRMData = function(manifest, protCtrl) {

        // Assign the session type to be used for this controller
        protCtrl.setSessionType($("#session-type").find(".active").children().attr("id"));
        //set a robustness level for chrome.
        //Possible values are SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL
        //protCtrl.setRobustnessLevel("SW_SECURE_CRYPTO");

        var data = {
            manifest: manifest,
            protCtrl: protCtrl,
            licenseReceived: false,
            sessions: []
        };
        var findSession = function(sessionID) {
            for (var i = 0; i < data.sessions.length; i++) {
                if (data.sessions[i].sessionID === sessionID)
                    return data.sessions[i];
            }
            return null;
        };
        $scope.drmData.push(data);
        $scope.safeApply();

        player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_SELECTED, function(e) {
            if (!e.error) {
                data.ksconfig = e.data.ksConfiguration;
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function(e) {
            if (!e.error) {
                var persistedSession = findSession(e.data.getSessionID());
                if (persistedSession) {
                    persistedSession.isLoaded = true;
                    persistedSession.sessionToken = e.data;
                } else {
                    var sessionToken = e.data;
                    data.sessions.push({
                        sessionToken: sessionToken,
                        sessionID: e.data.getSessionID(),
                        isLoaded: true
                    });
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_REMOVED, function(e) {
            if (!e.error) {
                var session = findSession(e.data);
                if (session) {
                    session.isLoaded = false;
                    session.sessionToken = null;
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_CLOSED, function(e) {
            if (!e.error) {
                for (var i = 0; i < data.sessions.length; i++) {
                    if (data.sessions[i].sessionID === e.data) {
                        data.sessions.splice(i, 1);
                        break;
                    }
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);

        player.on(dashjs.MediaPlayer.events.KEY_STATUSES_CHANGED, function(e) {
            var session = findSession(e.data.getSessionID());
            if (session) {
                var toGUID = function(uakey) {
                    var keyIdx = 0, retVal = "", i, zeroPad = function(str) {
                        return (str.length === 1) ? "0" + str : str;
                    };
                    for (i = 0; i < 4; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 6; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    return retVal;
                };
                session.keystatus = [];
                e.data.getKeyStatuses().forEach(function(status, key){
                    session.keystatus.push({
                        key: toGUID(new Uint8Array(key)),
                        status: status
                    });
                });
                $scope.safeApply();
            }
        }, $scope);

        player.on(dashjs.MediaPlayer.events.KEY_MESSAGE, function(e) {
            var session = findSession(e.data.sessionToken.getSessionID());
            if (session) {
                session.lastMessage = "Last Message: " + e.data.message.byteLength + " bytes";
                if (e.data.messageType) {
                    session.lastMessage += " (" + e.data.messageType + "). ";
                } else {
                    session.lastMessage += ". ";
                }
                session.lastMessage += "Waiting for response from license server...";
                $scope.safeApply();
            }
        }, $scope);

        player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function(e) {
            if (!e.error) {
                var session = findSession(e.data.sessionToken.getSessionID());
                if (session) {
                    session.lastMessage = "Successful response received from license server for message type '" + e.data.messageType + "'!";
                    data.licenseReceived = true;
                }
            } else {
                data.error = "License request failed for message type '" + e.data.messageType + "'! " + e.error;
            }
            $scope.safeApply();
        }, $scope);

        return data;
    };

    // Listen for protection system creation/destruction by the player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the player via MediaPlayer.attachSource()
    player.on(dashjs.MediaPlayer.events.PROTECTION_CREATED, function (e) {
        var data = addDRMData(e.manifest, e.controller);
        data.isPlaying = true;
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] !== data) {
                $scope.drmData[i].isPlaying = false;
            }
        }
        $scope.safeApply();
    }, $scope);
    player.on(dashjs.MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i].manifest.url === e.data) {
                $scope.drmData.splice(i, 1);
                break;
            }
        }
        $scope.safeApply();
    }, $scope);

    var manifestLoaded = function (manifest/*, error*/) {
        if (manifest) {
            var found = false;
            for (var i = 0; i < $scope.drmData.length; i++) {
                if (manifest.url === $scope.drmData[i].manifest.url) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var protCtrl = player.getProtectionController();
                if ($scope.selectedItem.hasOwnProperty("protData")) {
                    protCtrl.setProtectionData($scope.selectedItem.protData);
                }

                addDRMData(manifest, protCtrl);

                protCtrl.initialize(manifest);
            }

        } else {
            // Log error here
        }

    };

    $scope.doLicenseFetch = function () {
        player.retrieveManifest($scope.selectedItem.url, manifestLoaded);
    };

    $scope.play = function(data) {
        player.attachProtectionController(data.protCtrl)
        player.attachSource(data.manifest);
        for (var i = 0; i < $scope.drmData.length; i++) {
            var drmData = $scope.drmData[i];
            drmData.isPlaying = !!(drmData === data);
        }
    };

    $scope.loadSession = function(protCtrl, session) {
        protCtrl.loadKeySession(session.sessionID);
    };

    $scope.removeSession = function(protCtrl, session) {
        protCtrl.removeKeySession(session)
    };

    $scope.closeSession = function(protCtrl, session) {
        protCtrl.closeKeySession(session);
    };

    $scope.delete = function(data) {
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] === data) {
                $scope.drmData.splice(i,1);
                data.protCtrl.reset();
                $scope.safeApply();
            }
        }
    };

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty("logo")
                && item.logo !== null
                && item.logo !== undefined
                && item.logo !== "");
    };

    // Get initial stream if it was passed in.
	var paramUrl = null;

    if (vars && vars.hasOwnProperty("url")) {
    	paramUrl = vars.url;
    }

    if (vars && vars.hasOwnProperty("mpd")) {
    	paramUrl = vars.mpd;
    }

    if (paramUrl !== null) {
    	var startPlayback = true;
    
    	$scope.selectedItem = {};
        $scope.selectedItem.url = paramUrl;

        if (vars.hasOwnProperty("autoplay")) {
        	startPlayback = (vars.autoplay === 'true');
        }

    	if (startPlayback) {
	    	$scope.doLoad();
		}
    }
});
