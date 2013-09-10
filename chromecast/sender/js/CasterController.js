function CasterController($scope) {
    $scope.availableStreams = [
        {
            name: "4K",
            url: "http://dash.edgesuite.net/akamai/test/tears1/tearsofsteel_4096x1714_14Mbps.mpd",
            isLive: false
        },

        // --------
        // Fraunhofer
        // --------

        {
            name: "Fraunhofer - HEACC 2.0 - Dream",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/ElephantsDream/elephants_dream_480p_heaac2_0.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - HEACC 2.0 - Sintel",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/Sintel/sintel_480p_heaac2_0.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - HEACC 5.1 - 6 CH ID",
             url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/6chId/6chId_480p_heaac5_1.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - HEACC 5.1 - Dream",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/ElephantsDream/elephants_dream_480p_heaac5_1.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - HEACC 5.1 - Sintel",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/Sintel/sintel_480p_heaac5_1.mpd",
            isLive: false
        },
        /*{
            name: "Fraunhofer - HEACC 7.1 - 8 CH ID",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_7_1_with_video/8chId/8ch_id_480p_heaac7_1.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - MPS 5.0 - 6 CH ID",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/6chId/6chId_480p_mps5_1.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - MPS 5.0 - Dream",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/ElephantsDream/elephants_dream_480p_mps5_1.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - MPS 5.0 - Sintel",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/Sintel/sintel_480p_mps5_1.mpd",
            isLive: false
        },*/
        {
            name: "Fraunhofer - Audio Only - Dream",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/ElephantsDream/elephants_dream_audio_only_heaac2_0.mpd",
            isLive: false
        },
        {
            name: "Fraunhofer - Audio Only - Sintel",
            url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/Sintel/sintel_audio_only_heaac2_0.mpd",
            isLive: false
        },

        // --------
        // Live
        // --------

        {
            name: "Path 1 Live",
            url: "http://dash-live-path1.edgesuite.net/dash/manifest.mpd",
            isLive: true
        },
        {
            name: "Unified Streaming Live",
            url: "http://live.unified-streaming.com/loop/loop.isml/loop.mpd?format=mp4&session_id=25020",
            isLive: true
        },
        {
            name: "Wowza SegmentList",
            url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvlist.mpd",
            isLive: true
        },
        {
            name: "Wowza SegmentTemplate",
            url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvnumber.mpd",
            isLive: true
        },
        {
            name: "Wowza SegmentTimeline",
            url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvtime.mpd",
            isLive: true
        },
        {
            name: "Thomson Live",
            url: "http://tvnlive.dashdemo.edgesuite.net/live/manifest.mpd",
            isLive: true
        },
        {
            name: "Media Excel Live 1",
            url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch1/dash.mpd",
            isLive: true
        },
        {
            name: "Media Excel Live 2",
            url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch2/dash.mpd",
            isLive: true
        },

        // --------
        // Baseline
        // --------

        {
            name: "Live Archive",
            url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd",
            isLive: false
        },
        {
            name: "Envivio",
            url: "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
            isLive: false
        },
        {
            name: "Segment List",
            url: "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd",
            isLive: false
        },
        {
            name: "Segment Template",
            url: "http://www.digitalprimates.net/dash/streams/mp4-live-template/mp4-live-mpd-AV-BS.mpd",
            isLive: false
        },
        {
            name: "Unified Streaming - Timeline",
            url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
            isLive: false
        },

        // --------
        // Microsoft
        // --------

        {
            name: "Microsoft #1",
            url: "http://origintest.cloudapp.net/media/SintelTrailer_MP4_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
            isLive: false
        },
        {
            name: "Microsoft #2",
            url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
            isLive: false
        },
        {
            name: "Microsoft #3",
            url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)",
            isLive: false
        },
        {
            name: "Microsoft #4",
            url: "http://origintest.cloudapp.net/media/MPTExpressionData01/ElephantsDream_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)",
            isLive: false
        },
        {
            name: "Microsoft #5",
            url: "http://origintest.cloudapp.net/media/MPTExpressionData02/BigBuckBunny_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)",
            isLive: false
        },

        // --------
        // D-Dash
        // --------

        {
            name: "D-Dash #1",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=2&type=full",
            isLive: false
        },
        {
            name: "D-Dash #2",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=4&type=full",
            isLive: false
        },
        {
            name: "D-Dash #3",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=6&type=full",
            isLive: false
        },
        {
            name: "D-Dash #4",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=8&type=full",
            isLive: false
        },
        {
            name: "D-Dash #5",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=10&type=full",
            isLive: false
        },
        {
            name: "D-Dash #6",
            url: "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=15&type=full",
            isLive: false
        },

        // --------
        // Dash IF Test Vectors
        // --------

        {
            name: "DASH-AVC/264 – test vector 1a - Netflix",
            url: "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 1a - Sony",
            url: "http://dash.edgesuite.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 1b - Envivio",
            url: "http://dash.edgesuite.net/dash264/TestCases/1b/envivio/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 1b - Thomson",
            url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/2/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 1c - Envivio",
            url: "http://dash.edgesuite.net/dash264/TestCases/1c/envivio/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 2a - Envivio",
            url: "http://dash.edgesuite.net/dash264/TestCases/2a/envivio/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 2a - Sony",
            url: "http://dash.edgesuite.net/dash264/TestCases/2a/sony/SNE_DASH_CASE_2A_SD_REVISED.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 2a - Thomson",
            url: "http://dash.edgesuite.net/dash264/TestCases/2a/thomson-networks/2/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 3a - Fraunhofer",
            url: "http://dash.edgesuite.net/dash264/TestCases/3a/fraunhofer/ed.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 3b - Fraunhofer",
            url: "http://dash.edgesuite.net/dash264/TestCases/3b/fraunhofer/elephants_dream_heaac2_0.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 3b - Sony",
            url: "http://dash.edgesuite.net/dash264/TestCases/3b/sony/SNE_DASH_CASE3B_SD_REVISED.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 4b - Sony",
            url: "http://dash.edgesuite.net/dash264/TestCases/4b/sony/SNE_DASH_CASE4B_SD_REVISED.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 5a - Thomson/Envivio",
            url: "http://dash.edgesuite.net/dash264/TestCases/5a/1/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 5b - Thomson/Envivio",
            url: "http://dash.edgesuite.net/dash264/TestCases/5b/1/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 6c - Envivio Manifest 1",
            url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest.mpd",
            isLive: false
        },
        {
            name: "DASH-AVC/264 – test vector 6c - Envivio Manifest 2",
            url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest2.mpd",
            isLive: false
        }
    ];

    // -----------------------------------
    // Properties
    // -----------------------------------

    var STATE_LOADING = "loading",
        STATE_READY = "ready",
        STATE_CASTING = "casting",
        self = this,
        initialized = false;

    $scope.castApiReady = false;
    $scope.hasError = false;
    $scope.playing = false;
    $scope.muted = false;
    $scope.volume = 1;
    $scope.duration = 0;
    $scope.currentTime = 0;

    // -----------------------------------
    // Getters / Setters
    // -----------------------------------

    $scope.setStream = function (item) {
        $scope.selectedItem = item;
    }

    $scope.setReceiver = function (item) {
        $scope.receiver = item;
        Caster.doLaunch($scope.receiver);
    }

    $scope.isReceiverSelected = function (item) {
        return ($scope.receiver === item);
    }

    // -----------------------------------
    // Casting Methods
    // -----------------------------------

    $scope.doCast = function () {
        $scope.state = STATE_CASTING;
        Caster.loadMedia($scope.selectedItem.url, $scope.selectedItem.isLive);
        $scope.playing = true;
    }

    $scope.stopCast = function () {
        $scope.state = STATE_READY;
        Caster.stopPlayback();
        $scope.playing = false;
    }

    $scope.togglePlayback = function () {
        if ($scope.playing) {
            Caster.pauseMedia();
            $scope.playing = false;
        }
        else {
            Caster.playMedia();
            $scope.playing = true;
        }
    }

    $scope.doSeek = function () {
        var x = event.layerX,
            w = $("#scrubber").width(),
            p = x / w,
            v = $scope.duration * p;
        Caster.seekMedia(v);
    }

    $scope.toggleMute = function () {
        if ($scope.muted) {
            Caster.unmuteMedia();
            $scope.muted = false;
        }
        else {
            Caster.muteMedia();
            $scope.muted = true;
        }
    }

    $scope.turnVolumeDown = function () {
        $scope.volume -= 0.1;
        if ($scope.volume < 0) {
            $scope.volume = 0;
        }
        Caster.setMediaVolume($scope.volume);
    }

    $scope.turnVolumeUp = function () {
        $scope.volume += 0.1;
        if ($scope.volume > 1) {
            $scope.volume = 1;
        }
        Caster.setMediaVolume($scope.volume);
    }

    $scope.toggleStats = function () {
        Caster.toggleStats();
    }

    // -----------------------------------
    // Initialization
    // -----------------------------------

    $(window).bind("message", function (e) {
        if (event.source !== window) {
            return;
        }

        if (!Caster.isCastInitMessage(event)) {
            return;
        }

        if (initialized) {
            return;
        }

        initialized = true;

        if (cast === undefined || cast === null) {
            $scope.errorMessage = "Chromecast API not detected.";
            $scope.hasError = true;
            $scope.$apply();
        }
        else {
            Caster.initialize(self);
        }
    });

    // -----------------------------------
    // Caster Delegate Methods
    // -----------------------------------

    this.onReceiverList = function (list) {
        if (list.length === 0) {
            $scope.errorMessage = "No Chromecast receivers detected for the Dash.JS application.";
            $scope.hasError = true;
        }
        else {
            $scope.castApiReady = true;
            $scope.receivers = list;
            $scope.state = STATE_READY;
        }

        $scope.$apply();
    }

    this.onTimeUpdate = function (time) {
        $scope.currentTime = time;
        var w = $("#scrubber").width(),
            p = ($scope.currentTime / $scope.duration) * 100;
        $("#scrubber-content").width(p + "%");
    }

    this.onDurationChange = function (duration) {
        $scope.duration = duration;
    }

    this.onEnded = function () {

    }
}
