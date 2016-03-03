AKAMAI

var AKAMAI_MEDIA_ANALYTICS_CONFIG_FILE_PATH = 'http://ma1-r.analytics.edgesuite.net/config/beacon-1687.xml?enableGenericAPI=1',
    MEDIA_SOURCE_FILE = 'akamai/media/sources.json',
    LOGGING = true,
    UPDATEINTERVAL = 333,
    MAXGRAPHPOINTS = 250,
    GRAPH_COLORS =
    [
        'rgb(0, 150, 215)', //Blue
        'rgb(236, 114, 34)', //Orange
        'rgb(211, 29, 51)', //Red
        'rgb(0, 153, 61)', //Green
    ],
    player,
    controlbar,
    videoEl,
    debug,
    akamaiDebug = new AkamaiDebug($('#debugLogView')),
    metricsUpdater = null,
    filesystem,
    logFileName,
    logFileURL,
    logStreamEpoch,
    logTimeStampHeader,
    logModel,
    graphManager,
    graph,
    manifestData,
    lastVideoIndex = 0, //TODO remove lastVideoWidth var once quality switching as been added to dash.js
    errorList = [],
    htmlLogging = false,
    playing = false,
    dashSupported = false,
    webkitFileAPISupported = false,
    ccareNumber = 0,
    deviceInfoList = [],
    deviceInfoExcludeList = ['gif_animated', 'jpg'],
    manifestTreeExcludeList = ['__cnt', '__text','_asArray'],
    videoSwitchInProgress = false,
    vjsPlayer,
    videoAdaptationsAsArray;
    currentStreamInfo = null,
    isTokenAuthEnabled = false;
/**************************************************/
//Document Handlers
/**************************************************/
$(document).ready(initApplication);

/**************************************************/
//Button Click Handlers
/**************************************************/
$('#loadButton').click(loadButtonHandler);
$('#ccareButton').click(ccareButtonClickHandler);
$('#exitAlert').click(exitAlertHandler);
$('#shareButton').click(buildShareURL);

$("#DOMStorageCB").change(onDOMStorageCBChange);

//Manual Swithing Handlers
$('#manualSwitchingModeOn').click("on", setManualSwitchingMode);
$('#manualSwitchingModeOff').click("off", setManualSwitchingMode);
$('#videoAbrUp').click(['video', 'up'], manualSwitchingChangeQuality);
$('#videoAbrDown').click(['video', 'down'],  manualSwitchingChangeQuality);
$('#audioAbrUp').click(['audio', 'up'], manualSwitchingChangeQuality);
$('#audioAbrDown').click(['audio', 'down'], manualSwitchingChangeQuality);

//Manifest Tree
//$('#treeOpenAll').click("open_all", toggleTreeFold);
//$('#treeCloseAll').click("close_all", toggleTreeFold);

//Option Handlers
$('#hdnltTokenSwitch').change(onTokenSwitchChange);
$('#bitrateEnterButton').click('enter', setBitrate);
$('#bitrateClearButton').click('clear', setBitrate);
//Debug Handlers
$('#debugEnableButton').click(toggleHtmlLogging);
$('#debugDumpToDisk').click(dumpToDisk);
$('#debugFilterButton').click(toggleFilterInput);
$('#debugCopyButton').click(copyDebugConsole);
$('#debugClearButton').click(function()
{
    $('#debugLogView').html('');
});
$('#debugFilterSource').on('input', function()
{
    akamaiDebug.setFilter($('#debugFilterSource').val());
});
$('#modalExit').click(function()
{
    window.getSelection().removeAllRanges();
});

/**************************************************/
// Options/Configuration Window
/**************************************************/

$('#configurationButton').click(function(){
    slideOptionsWindow();
});

function slideOptionsWindow() {
    $(".options-wrapper").slideToggle( 'slow', function(){});
}

// Token Authentication Handlers
function onTokenSwitchChange() {

    isTokenAuthEnabled = $('#hdnltTokenSwitch').prop('checked');
    $('#hdnltRadioQuery').prop('disabled', !isTokenAuthEnabled);
    $('#hdnltRadioHeader').prop('disabled', !isTokenAuthEnabled);
    $('#hdnltInput').prop('disabled', !isTokenAuthEnabled);
}
/**************************************************/
//Change & Key Handlers
/**************************************************/
$('#videoScaleMode').change('video', resizeComponents);
$('#selectBox').change(function()
{
    $('#customURL').val( $('#selectBox').val());
});
$('#customURL').keypress(function (e)
{
    if (e.which == 13)
    {
        $('#loadButton').click();
    }
});
/**************************************************/
//Init Application Functions
/**************************************************/
function initApplication()
{
    videoEl = $("#videoElement")[0];
    videoEl.controls = false;
    if(browserSupported())
    {
        fetchMediaSamples();
        initGraphing();
        initStats();
        initUI();
    }
}

function initUI()
{
    $('#ccareButton').hide();
    $('#debugFilterSource').outerWidth($('#debugCtrlBar').width());
    $("#manifestTreeTab").hide();
    $("#debugCopyButton").prop('disabled', true);
    $("#debugDumpToDisk").prop('disabled', true);
    $("#debugClearButton").prop('disabled', true);
    $("#debugFilterButton").prop('disabled', true);
    $('#videoStatItemList').children(':first').click();
    $('#audioStatItemList').children(':first').click();
    $('#manualSwitchingModeOn').prop('disabled', true);
    $('#manualSwitchingModeOff').prop('disabled', true);
    resizeComponents();
}

function onDOMStorageCBChange(evt){
    if(player){
        player.enableLastBitrateCaching($("#DOMStorageCB").is(':checked'));
    }
}

function loadButtonHandler()
{
    initiateFileSystem(logFileName);

    $('#debugClearButton').click();
    graphManager.resetGraphData();

    if (statItemManager !== null) {
        statItemManager.reset();
        $('#num-video-bitrates-current').html(0);
        $('#num-video-bitrates-pending').html(0);
        $('#num-audio-bitrates-current').html(0);
        $('#num-audio-bitrates-pending').html(0);
    }

    //Init load
    load($('#customURL').val());

    //enable console buttons
    $("#debugCopyButton").prop('disabled', false);
    $("#debugClearButton").prop('disabled', false);
    $("#debugFilterButton").prop('disabled', false);
    if(webkitFileAPISupported)
    {
        $("#debugDumpToDisk").prop('disabled', false);
    }


    $('#manualSwitchingModeOn').prop('disabled', !player.getAutoSwitchQuality());

    //Set time interval on updateMetrics()
    window.clearInterval(metricsUpdater);
    metricsUpdater = setInterval(function(){ updateMetrics(); }, UPDATEINTERVAL);

    //$("#debugFilterSource").val('XXX');
    //$("#debugFilterSource").show();
    //akamaiDebug.setFilter($('#debugFilterSource').val());
    //toggleHtmlLogging();

}


/**************************************************/
//Dash.js Functions
/**************************************************/

function initPlayer()
{
    var context = isTokenAuthEnabled ? new Dash.di.AkamaiDashContext() : new Dash.di.DashContext();
    player = new MediaPlayer(context);
    player.startup();
    player.setAutoPlay($('#autoPlayCB').is(':checked'));
    player.attachView(videoEl);
    setupEventsListeners(true);

    controlbar = new ControlBar(player);
    controlbar.initialize();
    controlbar.disable();

    //player.clearDefaultUTCTimingSources();
    //player.enableManifestDateHeaderTimeSource = false
    //player.useSuggestedPresentationDelay(true);
    //player.setLiveDelayFragmentCount(10);
    //player.setNumOfParallelRequestAllowed(3);

    var dashAkamaiAnalytics = new AkamaiAnalytics.DashAkamaiAnalytics();
    dashAkamaiAnalytics.setDashMediaPlayer(player);

    $('#versionText').text('Dash.js v'+player.getVersion());
}

function onStreamComplete(e) {
    //if ($('#loopCB').is(':checked'))
    //{
    //    loadButtonHandler();
    //}
}

function setBitrate(type){

    if (player !== null){

        if ($('#maxAllowedBitrateCB').is(':checked') || $('#initialBitrateCB').is(':checked')){
            var value = type.data === 'clear' ? NaN : parseInt($('#bitrateTextBox').val()),
                mediaType = $("input:radio[name=bitrate_mediatype_rg]:checked").val();

            if ($('#initialBitrateCB').is(':checked')) {
                player.setInitialBitrateFor(mediaType, value);
                setInitialBitrateStat(mediaType);
            }
            if ($('#maxAllowedBitrateCB').is(':checked')) {
                player.setMaxAllowedBitrateFor(mediaType, value);
                setMaxAllowedBitrateStat(mediaType);
            }

            if (isNaN(value)) {
                $('#bitrateTextBox').val("")
            }
        }
        else
        {
            var msg = 'Please select Initial and/or Max Allowed when trying to set or clear bitrate values on player.'
            pushErrorToAlertBanner(msg, "info")
        }
    }
}

function load(url)
{
    if (player === undefined) {
        initPlayer();
        initDebugConsole();
    }

    if (isTokenAuthEnabled){
        var modifier = player.getObjectByContextName("requestModifierExt");
        type = $("input:radio[name=hdnlt]:checked").val() === 'query' ? MediaPlayer.dependencies.AkamaiRequestModifier.TOKEN_RETURN_QUERY : MediaPlayer.dependencies.AkamaiRequestModifier.TOKEN_RETURN_HEADER;
        modifier.setTransferMethod(type);
    }
    controlbar.reset()
    controlbar.enable();
    player.attachSource(url);
    playing = true;
}

function onPeriodSwitch(evt) {
    currentStreamInfo = evt.data.toStreamInfo;
}

function onTextTrackChange(evt){
    var tracks = video.textTracks;
    for(var i=0; i < tracks.length; i++ ){
        if (tracks[i].mode === "showing") {
            player.setTextTrack(i);
            break;
        }
    }
}

function setupEventsListeners(on)
{
    if (on)
    {
        player.addEventListener(MediaPlayer.events.MANIFEST_LOADED, onManifestLoad);
        player.addEventListener(MediaPlayer.events.STREAM_SWITCH_COMPLETED, onPeriodSwitch);
        videoEl.addEventListener("ended", onStreamComplete);
        videoEl.addEventListener("loadedmetadata", onMetaData);
    }
    else
    {
        player.removeEventListener(MediaPlayer.events.MANIFEST_LOADED, onManifestLoad);
        player.removeEventListener(MediaPlayer.events.STREAM_SWITCH_COMPLETED, onPeriodSwitch);
        videoEl.removeEventListener("ended", onStreamComplete);
        videoEl.removeEventListener("loadedmetadata", onMetaData);
    }
}

function onMetaData(event)
{
    resizeComponents();
    //treeBuilderHandler();
    toggleManualSwitchingButtonState ('video', player.getQualityFor('video'));
    toggleManualSwitchingButtonState ('audio', player.getQualityFor('audio'));
}

function supportsMediaSource() {
    var hasWebKit = ("WebKitMediaSource" in window),
        hasMediaSource = ("MediaSource" in window);

    return (hasWebKit || hasMediaSource);
}

function browserSupported()
{
    webkitFileAPISupported = window.requestFileSystem != undefined || window.webkitRequestFileSystem != undefined;
    if(!supportsMediaSource())
    {
        $('#modalPreloader').html(
            '<h1 class="supportedBrowserHeader text-center">This Browser Is Not Supported</h1>' +
                '<h4 class="supportedBrowserSubHeader text-center">These Browsers Currently Support DASH Playback:</h4>' +
                '<ul class="supportedBrowserText">' +
                '<li>Chrome (Mac/Win/Linux)</li>' +
                '<li>Chrome Canary (Mac/Win/Linux)</li>' +
                '<li>Internet Explorer 11 (Windows 8.1)</li>' +
                '</ul>'
        );
        return false;
    }

    return true;
}
/**************************************************/
//Pre - Init Application Functions
/**************************************************/

function preloaderAnimation(value)
{
    $('#modalPreloader').modal(value ? 'show' : 'hide');
}

function fetchMediaSamples()
{
    var errorMessage = '<b>ERROR: </b>';
    var handleError = function(err)
    {
        errorMessage = errorMessage + err;
        console.error('error', 'FETCH MEDIA SAMPLES: ' + err);
        pushErrorToAlertBanner(errorMessage, "error");
    }

    var vars = parseBrowserURL();
    if(vars['playlist'])
    {
        MEDIA_SOURCE_FILE = vars['playlist'];
    }
    $.getJSON(MEDIA_SOURCE_FILE, function()
    {
        if(LOGGING)
        {
            outputLog('log', 'DEBUG: JSON request successful');
        }
    })
    .done(function(data)
        {
            try
            {
                $.each(data.items, function(k ,v)
                {
                    $('#selectBox').append('<option value=' + v.url + '>' + v.name + '</option>');
                });

                $('#customURL').val( $('#selectBox').val());
                setStateFromBrowserURLArgs(vars)

                $('#content').css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1}, 'slow', function(){
                    resizeComponents();
                    preloaderAnimation(false);
                });

            }
            catch(err)
            {
                handleError(err);
            }
        })
        .fail(function(data)
        {
            var err = 'JSON request failed to load.';
            handleError(err);
        });
}

function buildShareURL()
{
    var urlPath = $(location).attr('href');
    if(urlPath.indexOf('?') > 0)
    {
        urlPath = urlPath.substring(0, urlPath.indexOf('?'));
    }

    function genLink()
    {
        $('#modalBody').html('<small>' + urlPath + '?source=' + $('#customURL').val() + '&autoplay=' + $('#autoplayOnLoad').prop('checked') + '</small>');
    }

    $('#modalLabel').html('Copy URL below to share media.');
    $('#modalFooter').html('<label class="topcoat-checkbox"><input type="checkbox" id="autoplayOnLoad"><div class="topcoat-checkbox__checkmark"></div>Autoplay on load.</label>');
    $('#autoplayOnLoad').click(genLink);
    genLink();

}

function setStateFromBrowserURLArgs(vars)
{
    if(vars['source'])
    {
        $('#customURL').val(vars['source']);
        if(vars['autoplay'] === 'true')
        {
            $('#loadButton').click();
        }
    }
    if(vars['ccare'] !== undefined && vars['ccare'] !== '')
    {
        ccareNumber = vars['ccare'];
        $('#ccareButton').show();
    }
}

function parseBrowserURL()
{
    //This method is going to parse the browserURL for query args that will be used to set the player state at startup.
    // Ie, share url, ccare ticket number playlist url etc.
    var urlPath = $(location).attr('href');
    if(urlPath[urlPath.length - 1] == '/')
    {
        urlPath = urlPath.substring(0, urlPath.length - 1);
    }
    var vars = [];
    var hash;
    var hashes = urlPath.slice(urlPath.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }

   return vars;
}
/**************************************************/
// Alert & Logging Functions
/**************************************************/
function outputLog(type, message)
{
    if(type == 'error')
    {
        console.error(message);
    }
    else if(type == 'log' && LOGGING)
    {
        console.log(message);
    }
}
//type should be string, lower case - possible types are: error, info, or success. no type will result in yellow banner
function pushErrorToAlertBanner(errorMessage, type)
{
    var alertBodyText = '';
    if(!$('#content').is(':visible'))
    {
        $('#content').css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1}, 'slow');
        preloaderAnimation(false);
    }
    if(errorList.indexOf(errorMessage) === -1) {
        errorList.push(errorMessage);
        for(var index in errorList)
        {
            alertBodyText = '<li>' + errorList[index] + '</li>' + alertBodyText;
        }
        alertBodyText = '<ul>' + alertBodyText + '</ul>';
        outputLog('error', alertBodyText);
        if (type !== undefined) {
            $('#alertBanner').addClass("alert-"+type);
        }
        $('#alertBody').html(alertBodyText);
        $('.alert').show();
    }
}

function exitAlertHandler()
{
    errorList = [];
    $('.alert').slideUp('fast');
}

/**************************************************/
//CCare Functions
/**************************************************/
function ccareButtonClickHandler()
{
    if(logModel != undefined)
    {
        var logs = '';
        var snapshotOfLogs = logModel;

        for(var i = snapshotOfLogs.length - 1; i >= 0; i--)
        {
            logs = snapshotOfLogs[i] + '\r\n' + logs;
        }
        logs = logTimeStampHeader + '\n' + logs;

        $.ajax(
            {
                //TODO move url to top as var
                type: 'POST',
                url: 'http://support.akamai.com/notify_ccare.html',
                data:
                {
                    ticket: ccareNumber,
                    user_name: 'DashSupportPlayer',
                    message: encodeURIComponent(logs)
                }
            }).done(function(msg)
            {
                alert( "Data Saved: " + msg );
            });
    }
    else
    {
        alert('ERROR: There are no logs to send to CCare');
    }
}

/**************************************************/
//Manual Switching Functions
/**************************************************/
function manualSwitchingChangeQuality(obj)
{
    var currentQuality = player.getQualityFor(obj.data[0]),
        newQuality = obj.data[1] === "up" ? currentQuality + 1: currentQuality - 1;

    toggleManualSwitchingButtonState (obj.data[0], newQuality);
    player.setQualityFor(obj.data[0], newQuality);
}

function setManualSwitchingMode(type)
{
    toggleManualSwitchingButtonState("video", player.getQualityFor("video"));
    toggleManualSwitchingButtonState("audio", player.getQualityFor("audio"));

    if(type.data == "on")
    {
        player.setAutoSwitchQuality(false);
        $('#manualSwitchingModeOff').prop('disabled', false);
        $('#manualSwitchingModeOn').prop('disabled', true);
        $('#dashSwitchingControlsAudioVideoDiv').slideDown('fast');
    }
    else
    {
        player.setAutoSwitchQuality(true);
        $('#manualSwitchingModeOff').prop('disabled', true);
        $('#manualSwitchingModeOn').prop('disabled', false);
        $('#dashSwitchingControlsAudioVideoDiv').slideUp('fast');
    }
}

function toggleManualSwitchingButtonState (type, newQuality)
{
    try
    {
        var max = playing ? player.getMetricsExt().getMaxIndexForBufferType(type) : 1;
        $('#' + type + 'AbrUp').prop('disabled', newQuality === (max -1));
        $('#' + type + 'AbrDown').prop('disabled', newQuality === 0);
    }
    catch(error){}
}

function onManifestLoad(event)
{
    manifestData = event.data;
    if(manifestData != null && manifestData.Period != undefined)
    {
        try {
            $(manifestData.Period.AdaptationSet_asArray).each(function(i)
            {
                var adaptation = manifestData.Period.AdaptationSet_asArray[i],
                    mimeType = adaptation.mimeType || adaptation.Representation_asArray[i].mimeType;

                if (mimeType.indexOf('video') !== -1)
                {
                    videoAdaptationsAsArray = manifestData.Period.AdaptationSet_asArray[i];
                }
            });
        }catch(e) {}
    }
}

/**************************************************/
//Debug Console
/**************************************************/
function initDebugConsole()
{
    debug = player.debug;
    debug.setLogTimestampVisible(true);
    debug.setLogToBrowserConsole(true);
    debug.eventBus.addEventListener('log', function(event)
    {
        var currentTime = (new Date()).getTime() - logStreamEpoch,
            timestamp = '[' + currentTime + ']';

        if(htmlLogging)
        {
            $('#debugLogView').prepend('<dt>' + timestamp + ' ' + event.message + '</dt>');
            akamaiDebug.filterLatest();
        }

        logModel.push(timestamp + ' ' + event.message);
    }, false);
}

function toggleHtmlLogging()
{
    $('#debugEnableButton').html(debugIsEnabled() ? 'Enable' : 'Disable');
    htmlLogging = debugIsEnabled();
    function debugIsEnabled()
    {
        return ($('#debugEnableButton').html() == 'Disable');
    }
}

function dumpToDisk()
{
    var downloadBtn = '<a class="span2 pull-right btn btn-warning" href="' +
        logFileURL + '" download="' +
        logFileName + '" id="modalDownloadButton">Download</a>',
        logFileNameField = '<input class="span4 pull-left" type="text" value="' + logFileName + '" id="logFileRename">'

    $('#modalLabel').html('Download.');
    $('#modalFooter').html('<span class="nav">' + downloadBtn + logFileNameField + '</span>');
    $('#modalBody').html('You may rename the log file in the URL field below.');
    $('#logFileRename').change(function()
    {
        var downloadFileName = ($('#logFileRename').val() != '') ? $('#logFileRename').val() : logFileName;
        $('#modalDownloadButton').attr('download', downloadFileName);
    });

    if(logFileName)
    {
        writeChangesToLog(logFileName);
    }

}

function toggleFilterInput()
{
    var filterSourceVisible = ($('#debugFilterSource').is(':visible'));
    filterSourceVisible ? $('#debugFilterSource').hide() : $('#debugFilterSource').show();
    resizeConsoles();
}

function dumpToDiskErrorHandler(e)
{
    var msg = e.message;
    outputLog('log', 'File system: ' + msg);
}

/***INITIATE FILESYSTEM***/
function initiateFileSystem(fileName)
{
    var date = new Date(),
        time = date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1"),
        day = date.getDate(),
        month = date.getMonth() + 1, //Months are zero based
        year = date.getFullYear();

    logTimeStampHeader = '[' + month + '-' + day + '-' + year + ':' + time + ']';
    logFileName = logTimeStampHeader + '.txt';
    logStreamEpoch = date.getTime();
    logModel = [];

    if (webkitFileAPISupported)
    {
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.TEMPORARY, 1024*1024, function(fs)
        {
            window.filesystem = fs;
            //If exists, delete old log. Otherwise make new one.
            filesystem.root.getFile(fileName, {create: false}, function(fileEntry)
            {
                fileEntry.remove(function()
                {
                    outputLog('log', 'DEBUG: Dirty filesystem. ' + logFileName + ' removed');
                    createLogFile(fileName, true);
                }, dumpToDiskErrorHandler);

            }, function()
            {
                outputLog('log', 'DEBUG: Clean filesystem');
                createLogFile(fileName, true);
            });
        }, dumpToDiskErrorHandler);
    }
}

/***MAKE***/
function createLogFile(fileName, debug)
{
    filesystem.root.getFile(fileName, {create: true}, function(fileEntry)
    {
        if(debug)
        {
            outputLog('log', 'DEBUG: ' + logFileName + ' created.');
        }

        logFileURL = fileEntry.toURL();

    }, dumpToDiskErrorHandler);
}

/***DELETE***/
function deleteLogFile(fileName)
{ 
    filesystem.root.getFile(fileName, {create: false}, function(fileEntry)
    {
        fileEntry.remove(function()
        {
            outputLog('log', 'File removed.');
        }, dumpToDiskErrorHandler);
    }, dumpToDiskErrorHandler);
}

function writeToLogFile(currentText, fileName)
{
    filesystem.root.getFile(fileName, {create: true}, function(fileEntry)
    {
        fileEntry.createWriter(function(fileWriter)
        {
            document.writer = fileWriter;
            var blob = new Blob([currentText], {type: 'text/plain'});
            fileWriter.write(blob);
        }, dumpToDiskErrorHandler);
    }, dumpToDiskErrorHandler);
}

function writeChangesToLog(fileName)
{
    var logs = '',
        writeProcedure = function()
        {
            var snapshotOfLogs = logModel;

            createLogFile(fileName);
            for(var i = snapshotOfLogs.length - 1; i >= 0; i--)
            {
                logs = snapshotOfLogs[i] + '\r\n' + logs;
            }
            logs = logTimeStampHeader + '\n' + logs;
            writeToLogFile(logs, fileName);
        };

    //If exists, delete old log. Otherwise make new one.
    filesystem.root.getFile(fileName, {create: false}, function(fileEntry)
    {
        fileEntry.remove(function()
        {
            writeProcedure();
        }, dumpToDiskErrorHandler);

    }, writeProcedure);
}

function copyDebugConsole()
{
    var selectBtn = '<button class="btn btn-warning" id="modalSelectBody">Select Content</button>';

    $('#modalLabel').html('Please copy text.');
    $('#modalFooter').html(selectBtn);
    $('#modalSelectBody').click(function()
    {
        selectText($('#modalBody'));
    });
    $('#modalBody').html($('#debugLogView').html());
}

function selectText(element) 
{
    //Element must be converted into HTML DOM becuase JQuery does not support range selection
    var text = element[0],
        range,
        selection;

    if(window.getSelection)
    { 
        selection = window.getSelection();        
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}
/**************************************************/
//Graphing
/**************************************************/
function initGraphing()
{
    graphManager = new GraphManager(MAXGRAPHPOINTS);
    graphManager.pushGraph(new GraphVO(GRAPH_COLORS[0], 2), 0);
    graphManager.pushGraph(new GraphVO(GRAPH_COLORS[1], 3), 1);
    graphManager.pushGraph(new GraphVO(GRAPH_COLORS[2], 4), 2);
    graphManager.pushGraph(new GraphVO(GRAPH_COLORS[3], 5), 3);

    graph = $.plot($("#buffer-placeholder"), [],
    {
        xaxes: [{position: 'bottom'}],
        yaxes: [ 
            {show: true, ticks: false, position: 'right'},
            {color: GRAPH_COLORS[0], position: 'right', min: 0}, 
            {color: GRAPH_COLORS[1], position: 'right', min: 0}, 
            {color: GRAPH_COLORS[2], position: 'right', min: 0}, 
            {color: GRAPH_COLORS[3], position: 'right', min: 0}
                ],
        legend: {container: $('#graphLegend'), noColumns: 4}
    });

    graph.setData(graphManager.getGraphs());
    graph.setupGrid();
    graph.draw();
}

function initStats()
{
    //TODO Need UI indication that some items in stats are chartable while others are not.
    statItemManager = new StatItemManager();
    statItemManager.pushStatItemVO(new StatItemVO('#video-buffer', 'Buffer Length', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#video-index', 'Current Index', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#video-pending-index', 'Pending Index', ''));
    //statItemManager.pushStatItemVO(new StatItemVO('#video-max-index', 'Maximum Index', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#video-value', 'Bitrates Playing', 'Kbps'));
    //statItemManager.pushStatItemVO(new StatItemVO('#video-max-bitrate', 'Maximum Bitrate', 'Kbps'));
    statItemManager.pushStatItemVO(new StatItemVO('#video-dropped-frames', 'Dropped Frames', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#audio-buffer', 'Buffer Length', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#audio-index', 'Current Index', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#audio-pending-index', 'Pending Index', ''));
    //statItemManager.pushStatItemVO(new StatItemVO('#audio-max-index', 'Maximum Index', ''));
    statItemManager.pushStatItemVO(new StatItemVO('#audio-value', 'Bitrates Playing', 'Kbps'));
    //statItemManager.pushStatItemVO(new StatItemVO('#audio-max-bitrate', 'Maximum Bitrate', 'Kbps'));
    statItemManager.pushStatItemVO(new StatItemVO('#audio-dropped-frames', 'Dropped Frames', ''));
}

function setMaxAllowedBitrateStat(type)
{
    var maxAllowedBitrate = player.getMaxAllowedBitrateFor(type);
    $('#' + type + '-max-bitrate').html(isNaN(maxAllowedBitrate) ? 'N/A' : maxAllowedBitrate + ' Kbps');
}

function setInitialBitrateStat(type)
{
    var initialBitrate = player.getInitialBitrateFor(type);
    $('#' + type + '-init-bitrate').html(isNaN(initialBitrate) ? 'N/A' : initialBitrate + ' Kbps');
}

function populateMetrics(type)
{
    var metrics = player.getMetricsFor(type),
        metricsExt = player.getMetricsExt(),
        repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics),
        bufferLevel = metricsExt.getCurrentBufferLevel(metrics),
        droppedFramesMetric = metricsExt.getCurrentDroppedFrames(metrics),
        currentTime = ((new Date()).getTime() - logStreamEpoch)/1000,
        totalIndex = 0,
        maxAllowedIndex = NaN,
        periodIdx = currentStreamInfo !== null ? currentStreamInfo.index : 0,
        periodId  = currentStreamInfo !== null ? currentStreamInfo.id : null;

    if(metrics && metricsExt && bufferLevel)
    {
        statItemManager.pushValueByID([currentTime, metricsExt.getCurrentBufferLevel(metrics).level.toPrecision(5)], '#' + type + '-buffer');
        statItemManager.pushValueByID([currentTime, player.getQualityFor(type)], '#' + type + '-pending-index');
        statItemManager.pushValueByID([currentTime, (droppedFramesMetric != null) ? droppedFramesMetric.droppedFrames : '0'], '#' + type + '-dropped-frames');

        if (repSwitch !== null)
        {
            var bitrateIndexValue = metricsExt.getIndexForRepresentation(repSwitch.to, periodIdx);
            totalIndex = metricsExt.getMaxIndexForBufferType(type, periodIdx) - 1;
            maxAllowedIndex = metricsExt.getMaxAllowedIndexForBufferType(type, periodId);
            statItemManager.pushValueByID([currentTime, bitrateIndexValue], '#' + type + '-index');
            statItemManager.pushValueByID([currentTime, Math.round((metricsExt.getBandwidthForRepresentation(repSwitch.to, periodIdx))/1000)], '#' + type + '-value');
        }

        $('#' + type + '-max-index').html(maxAllowedIndex);
        $('#num-' + type + '-bitrates-current').html(totalIndex);
        $('#num-' + type + '-bitrates-pending').html(totalIndex);

        setMaxAllowedBitrateStat(type);
    }


    //Push selected stats into the graph
    var currentItem;

    for(var index in statItemManager.getStatItemVOs())
    {
        currentItem = statItemManager.getStatItemVOs()[index];

        if(currentItem.isSelected)
        {
            graphManager.pushDataToGraph(currentItem.value, currentItem.graphVO);
        }
        currentItem.value = null;
    }

    //TODO remove this patch once quality switching event window as been added to dash.js
    //if(type == 'video' && playing && $('#videoScaleMode').val() == 'native')
    //{
    //    if(player.getAutoSwitchQuality() && player.getQualityFor('video') != bitrateIndexValue)
    //    {
    //        if(LOGGING)
    //        {
    //            console.log('videoSwitchInProgress0');
    //        }
    //        videoSwitchInProgress = true;
    //    }
    //    else if(videoSwitchInProgress)
    //    {
    //        if(LOGGING)
    //        {
    //            console.log('videoSwitchInProgress1');
    //        }
    //        resizeComponents('video');
    //        videoSwitchInProgress = false;
    //    }
    //    else //ManualSwitchingMode is off
    //    {
    //        if(lastVideoIndex != bitrateIndexValue)
    //        {
    //            resizeVideoForMode("")
    //            lastVideoIndex = bitrateIndexValue;
    //        }
    //    }

//        if(playing && $('#videoScaleMode').val() == 'native')
//        {
//            if(lastVideoWidth != $('video').width())
//            {
//                resizeComponents('video');
//            }
//        }
//        lastVideoWidth = $('video').width();
    //}
}

function updateMetrics()
{
    populateMetrics('video');
    populateMetrics('audio');

    if($('#footer').is(':visible'))
    {
        graph.setData(graphManager.getGraphs());
        graph.setupGrid();

        var videoModel = player.getVideoModel();

        if (player !== null &&
            videoModel !== null &&
            videoModel.getElement() !== null &&
            !videoModel.isPaused())
        {
            graph.draw();
        }
    }
}

/**************************************************/
//Manifest Tree
/**************************************************/
//function toggleTreeFold(obj)
//{
//    $("#manifestTree").jstree(obj.data, -1);
//}
//
//function isFilteredKeyword(possibleKeyword, filterList)
//{
//    for(var keyFragments in filterList)
//    {
//        if(possibleKeyword.indexOf(filterList[keyFragments]) != -1)
//        {
//            return true;
//        }
//    }
//    return false;
//}
//
//function treeBuilderHandler()
//{
//    treeBuilder(manifestTreeExcludeList);
//    $("#manifestTreeTab").show();
//}
//
//
//
//function treeBuilder(filterList)
//{
//    var data =
//    {
//        "data": "Manifest Data",
//        "children": []
//    };
//
//    function isParentOfLeaf(children)
//    {
//        return typeof children == 'string' || typeof children == 'number';
//    }
//
//    function traverse(root, data, filter)
//    {
//        for(var child in root)
//        {
//           // console.log(!(isFilteredKeyword(child, filter)));
//            if(!(isFilteredKeyword(child, filter))) //Negated to make exclude list filter
//            {
//                if(isParentOfLeaf(root[child]))
//                {
//                    data.children.push(
//                    {
//                        "data": child,
//                        "children": [{"data": root[child].toString()}]
//                    });
//                }
//                else if(typeof root[child] == 'object')
//                {
//                    var len = data.children.push(
//                    {
//                        "data": child,
//                        "children": []
//                    });
//                    traverse(root[child], data.children[len - 1], filter);
//                }
//            }
//        }
//    }
//
//    if(manifestData !== undefined)
//    {
//        traverse(manifestData, data, filterList);
//
//        $(function()
//        {
//            $("#manifestTree").jstree(
//            {
//                'json_data': {'data': data},
//                'ui': {'select_limit': 0},
//                'themes':
//                {
//                    'theme': 'default',
//                    'dots': true,
//                    'icons': false
//                },
//                'plugins': ['themes', 'json_data', 'ui']
//            });
//        });
//    }
//}

/**************************************************/
//Device Info  The UI for this is deactivated until we can support CORS headers on this domain.
/**************************************************/
//$.get('http://edc.edgesuite.net/', function(data)
//$.get('akamai/media/Device_Info_Test.html', function(data) //Mocked call
//{
//    var tempTitle = '';
//    var tempValue = '';
//    var parsedHtml = $.parseHTML(data);
//
//    deviceInfoList.push({title: 'User-Agent', value: $($('.user-agent-name', parsedHtml)[0]).html()});
//    deviceInfoList.push({title: 'Network', value: $($('.user-agent-name', parsedHtml)[1]).html()});
//    $('p', parsedHtml).each(function(index, value)
//    {
//        if($(value).hasClass('gray'))
//        {
//            tempTitle = $(value).html();
//        }
//        else
//        {
//            tempValue = ($(value).html() != '') ? $(value).html() : 'unknown';
//            deviceInfoList.push({title: tempTitle, value: tempValue});
//        }
//    });
//    for(var item in deviceInfoList)
//    {
//        if(!(isFilteredKeyword(deviceInfoList[item].title, deviceInfoExcludeList))) //Negated to make exclude list filter
//
//        {
//            $('#deviceInfo').append('<dt>' + deviceInfoList[item].title + '</dt>');
//            $('#deviceInfo').append('<dd>' + deviceInfoList[item].value + '</dd>');
//        }
//    }
//});