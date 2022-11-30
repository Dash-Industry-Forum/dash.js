// We import the settings.js file to know which address we should contact
// to talk to Janus, and optionally which STUN/TURN servers should be
// used as well. Specifically, that file defines the "server" and
// "iceServers" properties we'll pass when creating the Janus session.
const { server, iceServers } = require("./settings");

var janus = null;
var streaming = null;
var opaqueId = "streamingtest-" + Janus.randomString(12);

var remoteTracks = {},
  remoteVideos = 0;

var streamsList = {};
var selectedStream = null;

Janus.init({
  debug: "all",
  callback: function () {
    // Create session
    janus = new Janus({
      server: server,
      iceServers: iceServers,
      success: function () {
        janus.attach({
          plugin: "janus.plugin.streaming",
          opaqueId: opaqueId,
          success: function (pluginHandle) {
            streaming = pluginHandle;
            Janus.log(
              "Plugin attached! (" +
                streaming.getPlugin() +
                ", id=" +
                streaming.getId() +
                ")"
            );
            updateStreamsList();
          },
          error: function (error) {
            Janus.error("  -- Error attaching plugin... ", error);
          },
          iceState: function (state) {
            Janus.log("ICE state changed to " + state);
          },
          webrtcState: function (on) {
            Janus.log(
              "Janus says our WebRTC PeerConnection is " +
                (on ? "up" : "down") +
                " now"
            );
          },
          slowLink: function (uplink, lost, mid) {
            Janus.warn(
              "Janus reports problems " +
                (uplink ? "sending" : "receiving") +
                " packets on mid " +
                mid +
                " (" +
                lost +
                " lost packets)"
            );
          },
          onmessage: function (msg, jsep) {
            Janus.debug(" ::: Got a message :::", msg);
            var result = msg["result"];
            if (result) {
              if (result["status"]) {
                var status = result["status"];
                if (status === "starting") {
                } else if (status === "started") {
                } else if (status === "stopped") stopStream();
              } else if (msg["streaming"] === "event") {
                // Does this event refer to a mid in particular?
                var mid = result["mid"] ? result["mid"] : "0";
              }
            } else if (msg["error"]) {
              stopStream();
              return;
            }
            if (jsep) {
              Janus.debug("Handling SDP as well...", jsep);
              console.log(jsep.sdp);
              var stereo = jsep.sdp.indexOf("stereo=1") !== -1;
              // Offer from the plugin, let's answer
              streaming.createAnswer({
                jsep: jsep,
                // We want recvonly audio/video and, if negotiated, datachannels
                media: { audioSend: false, videoSend: false, data: true },
                customizeSdp: function (jsep) {
                  if (stereo && jsep.sdp.indexOf("stereo=1") == -1) {
                    // Make sure that our offer contains stereo too
                    jsep.sdp = jsep.sdp.replace(
                      "useinbandfec=1",
                      "useinbandfec=1;stereo=1"
                    );
                  }
                },
                success: function (jsep) {
                  Janus.debug("Got SDP!", jsep);
                  var body = { request: "start" };
                  streaming.send({ message: body, jsep: jsep });
                },
                error: function (error) {
                  Janus.error("WebRTC error:", error);
                },
              });
            }
          },
          onremotetrack: function (track, mid, on) {
            Janus.debug(
              "Remote track (mid=" +
                mid +
                ") " +
                (on ? "added" : "removed") +
                ":",
              track
            );
            var mstreamId = "mstream" + mid;
            if (
              streamsList[selectedStream] &&
              streamsList[selectedStream].legacy
            )
              mstreamId = "mstream0";
            if (!on) {
              // Track removed, get rid of the stream and the rendering
              var stream = remoteTracks[mid];
              if (stream) {
                try {
                  var tracks = stream.getTracks();
                  for (var i in tracks) {
                    var mst = tracks[i];
                    if (mst) mst.stop();
                  }
                } catch (e) {}
              }
              if (track.kind === "video") {
                remoteVideos--;
                if (remoteVideos === 0) {
                }
              }
              delete remoteTracks[mid];
              return;
            }
            // If we're here, a new track was added
            var stream = null;
            if (track.kind === "audio") {
              // New audio track: create a stream out of it, and use a hidden <audio> element
              stream = new MediaStream([track]);
              remoteTracks[mid] = stream;
              Janus.log("Created remote audio stream:", stream);
            } else {
              // New video track: create a stream out of it
              remoteVideos++;
              stream = new MediaStream([track]);
              remoteTracks[mid] = stream;
              Janus.log("Created remote video stream:", stream);
            }
            Janus.attachMediaStream($("#remotevideo" + mid).get(0), stream);
          },
          ondataopen: function (data) {
            Janus.log("The DataChannel is available!");
          },
          ondata: function (data) {
            Janus.debug("We got data from the DataChannel!", data);
          },
          oncleanup: function () {
            Janus.log(" ::: Got a cleanup notification :::");
            spinner = {};
            simulcastStarted = false;
            remoteTracks = {};
            remoteVideos = 0;
            dataMid = null;
          },
        });
      },
      error: function (error) {
        Janus.error(error);
      },
      destroyed: function () {
        window.location.reload();
      },
    });
  },
});

function startStream() {
  var body = {
    request: "watch",
    id: parseInt(selectedStream) || selectedStream,
  };
  streaming.send({ message: body });
}

function stopStream() {
  var body = { request: "stop" };
  streaming.send({ message: body });
  streaming.hangup();
}
