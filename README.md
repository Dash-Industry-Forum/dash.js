<img src="https://cloud.githubusercontent.com/assets/2762250/7824984/985c3e76-03bc-11e5-807b-1402bde4fe56.png" width="400">

## Overview

dash.js is a JavaScript based implementation for the playback of MPEG DASH content in browser based
environments that support the [Media Source Extensions](https://w3c.github.io/media-source/) and
the [Encrypted Media Extensions](https://www.w3.org/TR/encrypted-media/).

## Documentation

To get started, check out our [documentation](https://dashif.org/dash.js/) that includes
a [quickstart guide](https://dashif.org/dash.js/pages/quickstart/index.html) , [usage instructions](https://dashif.org/dash.js/pages/usage/index.html)
and [contribution guidelines](https://dashif.org/dash.js/pages/developers/how-to-contribute.html).

## Hosted Examples

* [Reference Player](https://reference.dashif.org/dash.js/latest/samples/dash-if-reference-player/index.html)
* [Samples](https://reference.dashif.org/dash.js/latest/samples/index.html)

## Quickstart

A very basic example on how to use dash.js in your application can be found below:

```html
<!doctype html>
<html>
<head>
    <title>dash.js Rocks</title>
    <style>
        video {
            width: 640px;
            height: 360px;
        }
    </style>
</head>
<body>
<div>
    <video id="videoPlayer" controls></video>
</div>
<script src="https://cdn.dashjs.org/latest/modern/umd/dash.all.min.js"></script>
<script>
    (function () {
        var url = "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd";
        var player = dashjs.MediaPlayer().create();
        player.initialize(document.querySelector("#videoPlayer"), url, true);
    })();
</script>
</body>
</html>
```

## Contact

Please raise any issue directly on [Github](https://github.com/Dash-Industry-Forum/dash.js/issues).

You can also find us on [Slack!](https://join.slack.com/t/dashif/shared_invite/zt-egme869x-JH~UPUuLoKJB26fw7wj3Gg) and
on [Google Groups](https://groups.google.com/g/dashjs).

## License

dash.js is released under [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md)

## Tested With

[<img src="https://cloud.githubusercontent.com/assets/7864462/12837037/452a17c6-cb73-11e5-9f39-fc96893bc9bf.png" alt="Browser Stack Logo" width="300">](https://www.browserstack.com/)
&nbsp;&nbsp;
[<img src="https://www.lambdatest.com/support/img/logo.svg" alt="Lambdatest Logo" width="300">](https://www.lambdatest.com/)
