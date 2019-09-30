<!-- If you are raising a bug playing a stream, you must fill out the following or your issue may not be responded to. For features or improvements, you may delete this. -->
##### Environment
<!-- Replace [] with [x] to check off the list -->
- [] The MPD passes the DASH-IF Conformance Tool on https://conformance.dashif.org/
- [] The stream has correct Access-Control-Allow-Origin headers (CORS)
- [] There are no network errors such as 404s in the browser console when trying to play the stream
- [] The issue observed is not mentioned on https://github.com/Dash-Industry-Forum/dash.js/wiki/FAQ
- [] The issue occurs in the latest reference client on http://reference.dashif.org/dash.js/ and not just on my page
* Link to playable MPD file:
* Dash.js version:
* Browser name/version:
* OS name/version:

##### Steps to reproduce
1. Please provide clear steps to reproduce your problem
2. If the bug is intermittent, give a rough frequency if possible

##### Observed behaviour
Describe what the player is doing that is unexpected or undesired behaviour.

##### Console output
```
Paste the contents of the browser console here.
You may need to enable debug logging in dash.js by calling player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_DEBUG }}) if you are using your own page.
```
