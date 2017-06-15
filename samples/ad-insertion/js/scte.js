/**
 * Created by dsi on 11.05.2015.
 */
(function() {
    var player = dashjs.MediaPlayer().create();
        playerAd = dashjs.MediaPlayer().create();
        contentUrl = 'https://vm2.dashif.org/livesim/scte35_1/testpic_2s/Manifest.mpd ',
        adUrl = 'https://dash.akamaized.net/fokus/adinsertion-samples/scte/dash.mpd',
        currentlyAd = false;


    player.initialize(document.querySelector("#vid"), contentUrl, true);
    player.on('urn:scte:scte35:2013:xml',scteEvent,this);
    playerAd.initialize(document.querySelector("#vidAd"), adUrl, false);

    function scteEvent(e) {
        if(!currentlyAd) {
            startAd();
        }
        else {
            removeAd();
        }
        currentlyAd = !currentlyAd;
    }


    function removeEvent(e) {

    }

    function startAd() {
        $('#vid').css({
            'display':'none'
        });
        $('#vid').prop('muted',true);
        $('#vidAd').css({
            'display':'block'
        });
        $('#vidAd').prop('muted',false);
        playerAd.play();
    }

    function removeAd() {
        $('#vid').css({
            'display':'block'
        });
        $('#vid').prop('muted',false);
        $('#vidAd').css({
            'display':'none'
        });
        $('#vidAd').prop('muted',true);
    }
})();






