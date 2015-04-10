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

    var system = player.getSystem(),
        debug = system.getObject("debug");

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
        if ($scope.selectedItem.hasOwnProperty("protData")) {
            player.attachProtectionData($scope.selectedItem.protData);
        }
        player.attachSource($scope.selectedItem.url);
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

    var manifestLoader = system.getObject("manifestLoader");
    var uriQueryFragModel = system.getObject("uriQueryFragModel");
    $scope[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = function (e) {
        if (!e.error) {
            var manifest = e.data.manifest;
            var found = false;
            for (var i = 0; i < $scope.drmData.length; i++) {
                if (manifest.url === $scope.drmData[i].url) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var sessiontype = $("#session-type").find(".active").children().attr("id");
                var adapter = system.getObject("adapter");
                var streams = adapter.getStreamsInfo(manifest);
                var protCtrl = system.getObject("protectionController");
                var data = {
                    url: manifest.url,
                    protCtrl: protCtrl,
                    manifest: manifest,
                    sessions: []
                };
                var findSession = function(sessionID) {
                    for (var i = 0; i < data.sessions.length; i++) {
                        if (data.sessions[i].sessionID === sessionID)
                            return data.sessions[i];
                    }
                    return null;
                };
                var removeSession = function(sessionID) {
                };
                $scope.drmData.push(data);
                $scope.safeApply();

                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = function(e) {
                    if (!e.error) {
                        data.ksconfig = e.data.ksConfiguration;
                        $scope.safeApply();
                    } else {
                        data.error = e.error;
                    }
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = function(e) {
                    if (!e.error) {
                        $scope.safeApply();
                    } else {
                        data.error = e.error;
                    }
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED] = function(e) {
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
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED] = function(e) {
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
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED] = function(e) {
                    if (!e.error) {
                        for (var i = 0; i < data.sessions.length; i++) {
                            if (data.sessions[i].sessionID === e.data) {
                                data.splice(i, 1);
                                break;
                            }
                        }
                        $scope.safeApply();
                    } else {
                        data.error = e.error;
                    }
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_STATUSES_CHANGED] = function(e) {
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
                };
                this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE] = function(e) {
                    var session = findSession(e.data.sessionToken.getSessionID());
                    if (session) {
                        session.lastMessage = "Last Message: " + e.data.message.byteLength + " bytes ";
                        if (e.data.messageType) {
                            session.lastMessage += "(" + e.data.messageType + ")";
                        }
                        $scope.safeApply();
                    }
                };
                this[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR] = function(e) {
                    data.error = e.data;
                    $scope.safeApply();
                };

                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_STATUSES_CHANGED, this);
                protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
                protCtrl.subscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, this);

                if ($scope.selectedItem.hasOwnProperty("protData")) {
                    protCtrl.setProtectionData($scope.selectedItem.protData);
                }

                protCtrl.init(manifest, streams[0]);
                protCtrl.setSessionType(sessiontype);
            }

        } else {

        }

    };
    manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, $scope);

    $scope.doLicenseFetch = function () {
        uriQueryFragModel.reset();
        manifestLoader.load(uriQueryFragModel.parseURI($scope.selectedItem.url));
    };

    $scope.play = function(data) {
        player.attachProtectionController(data.protCtrl);
        player.attachSource(data.manifest);
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
