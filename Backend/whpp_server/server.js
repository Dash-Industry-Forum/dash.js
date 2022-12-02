import express from "express";
import bodyParser from "body-parser";
import Janode from "janode";
import StreamingPlugin from "janode/plugins/streaming";
import cors from "cors";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(cors());

const connection = await Janode.connect({
  is_admin: false,
  address: {
    url: "ws://3.69.75.114:8188/",
  },
});

let jsep;

let session
let stream

app.post("/offer", async function (req, res) {
  session = await connection.create();
  stream = await session.attach(StreamingPlugin);
  let offer = await stream.watch({ id: 1 });
  jsep = await offer.jsep;
  console.log("Offer requested");
  res.set("Content-Type", "text/plain");
  return res.send(jsep.sdp);
});

app.post("/answer", async function (req, res) {
  let sdpAnswer = req.body;
  let stereo = jsep.sdp.indexOf("stereo=1") !== -1;
  if (stereo && sdpAnswer.indexOf("stereo=1") == -1) {
    sdpAnswer = sdpAnswer.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
  }
  let remote_jsep = { type: "answer", sdp: sdpAnswer };
  await stream.start({ jsep: remote_jsep });
  return res.sendStatus(200);
});

app.listen(3001, () => console.log("WHPP server listenining on port 3001."));
