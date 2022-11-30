const { spawn } = require("child_process");
const watch = require("node-watch");
const fs = require("fs");
const xmlParser = require("xml2json");
const formatXml = require("xml-formatter");

const ls = spawn("bash", ["./ffmpeg.sh"]);

const path = "/home/fame/master_project/dash.js/manifest/";

watch(path, function (evt, name) {
  if (evt == "update" && name.endsWith("live.mpd")) {
    parseMPD();
  }
});

const manipulateMPD = (xmlObj) => {
  xmlObj["MPD"]["Period"]["AdaptationSet"].push(
    {
      id: "WEBRTC",
      contentType: "video",
      mimeType: "video RTP/AVP",
      codecs: "avc1.4D401F",
      initializationPrincipal: "whpp://localhost:3001/", // WHPP ENDPOINT,
      Representation: [
        {
          id: "video",
          mimeType: "video RTP/AVP",
          bandwidth: "250000",
          width: "1280",
          height: "720",
          frameRate: "24/1",
          codecs: "avc1.4D401F",
        },
      ],
    },
    {
      id: "WEBRTC",
      contentType: "audio",
      mimeType: "audio/mp4",
      codecs: "mp4a.40.5",
      initializationPrincipal: "whpp://localhost:3001/", // WHPP ENDPOINT,
      Representation: [
        {
          id: "audio",
          bandwidth: "250",
          codecs: "mp4a.40.5",
        },
      ],
    }
  );
  const stringifiedXmlObj = JSON.stringify(xmlObj);
  const finalXml = xmlParser.toXml(stringifiedXmlObj);
  fs.writeFile(
    path + "live.mpd",
    formatXml(finalXml, { collapseContent: true }),
    function (err, result) {
      if (err) {
        console.log("err");
      } else {
        // console.log("Xml file successfully updated.");
      }
    }
  );
};

const checkMPDHasWebRTC = (xmlObj) => {
  const adaptationSets = xmlObj["MPD"]["Period"]["AdaptationSet"];
  for (set of adaptationSets) {
    if (set.id === "WEBRTC") {
      return true;
    }
  }
  return false;
};

const parseMPD = () => {
  fs.readFile(path + "live.mpd", function (err, data) {
    const xmlObj = xmlParser.toJson(data, { reversible: true, object: true });
    if (!checkMPDHasWebRTC(xmlObj)) {
      manipulateMPD(xmlObj);
    }
  });
};

ls.stderr.on("data", (data) => {
  console.log(`Info: ${data}`);
});

ls.stdout.on("data", (data) => {
  console.log(`stdout: ${data}`);
});

// ls.on("error", (error) => {
//   console.log(`error: ${error.message}`);
// });

// ls.on("close", (code) => {
//   console.log(`child process exited with code ${code}`);
// });
