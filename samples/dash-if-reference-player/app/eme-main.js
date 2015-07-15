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
    context = new Dash.di.DashContext();
    player = new MediaPlayer(context);
    $scope.version = player.getVersion();

    player.startup();
    player.addEventListener(MediaPlayer.events.ERROR, onError.bind(this));

    player.attachView(video);
    player.setAutoPlay(true);

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
        player.attachSource($scope.selectedItem.url, null, protectionData);
        player.setAutoSwitchQuality($scope.abrEnabled);
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

        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_SYSTEM_SELECTED, function(e) {
            if (!e.error) {
                data.ksconfig = e.data.ksConfiguration;
                $scope.safeApply();
            } else {
                data.error = e.error;
            }
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_SESSION_CREATED, function(e) {
            if (!e.error) {
                var removedSession = findSession(e.data.getSessionID());
                if (removedSession) {
                    removedSession.removed = false;
                    removedSession.sessionToken = e.data;
                } else {
                    data.sessions.push({
                        sessionToken: e.data,
                        sessionID: e.data.getSessionID(),
                        removed: false
                    });
                }
                $scope.safeApply();
            } else {
                data.error = e.error;
            }
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_SESSION_REMOVED, function(e) {
            if (!e.error) {
                var session = findSession(e.data);
                if (session) {
                    session.removed = true;
                    session.sessionToken = null;
                }
                $scope.safeApply();
            } else {
                data.error = e.error;
            }
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_SESSION_CLOSED, function(e) {
            if (!e.error) {
                for (var i = 0; i < data.sessions.length; i++) {
                    if (data.sessions[i].sessionID === e.data) {
                        data.sessions.splice(i, 1);
                        break;
                    }
                }
                $scope.safeApply();
            } else {
                data.error = e.error;
            }
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_STATUSES_CHANGED, function(e) {
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
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.KEY_MESSAGE, function(e) {
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
        });
        protCtrl.addEventListener(MediaPlayer.dependencies.ProtectionController.events.LICENSE_REQUEST_COMPLETE, function(e) {
            if (!e.error) {
                var session = findSession(e.data.getSessionID());
                if (session) {
                    session.lastMessage = "Successful response received from license server!";
                    data.licenseReceived = true;
                }
            } else {
                data.error = "License request failed! " + e.error;
            }
            $scope.safeApply();
        });
        return data;
    };

    // Listen for protection system creation/destruction by the player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the player via MediaPlayer.attachSource()
    player.addEventListener(MediaPlayer.events.PROTECTION_CREATED, function (e) {
        var data = addDRMData(e.data.manifest, e.data.controller);
        data.isPlaying = true;
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] !== data) {
                $scope.drmData[i].isPlaying = false;
            }
        }
        $scope.safeApply();
    });
    player.addEventListener(MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i].manifest.url === e.data) {
                $scope.drmData.splice(i, 1);
                break;
            }
        }
        $scope.safeApply();
    });

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
                var sessiontype = $("#session-type").find(".active").children().attr("id");
                var protCtrl = player.createProtection();
                if ($scope.selectedItem.hasOwnProperty("protData")) {
                    protCtrl.setProtectionData($scope.selectedItem.protData);
                }

                addDRMData(manifest, protCtrl);

                protCtrl.init(manifest);
                protCtrl.setSessionType(sessiontype);
            }

        } else {
            // Log error here
        }

    };

    $scope.doLicenseFetch = function () {
        player.retrieveManifest($scope.selectedItem.url, manifestLoaded);
    };

    $scope.play = function(data) {
        player.attachSource(data.manifest, data.protCtrl);
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
                data.protCtrl.teardown();
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
