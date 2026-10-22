# Description

The `functional-karma` testsuite implements functional tests using the Karma Testrunner. Functional tests are used to
test player functionality such as play, pause and seek.

# Structure

The source files are placed in multiple folders:

* `adapter`: Adapter classes that implement additional logic to run a test. For instance the `DashJsAdapter.js` serves
  as a wrapper around dash.js functionality.
* `config`: Test configuration files that define a set of testcases to be executed. The target configuration file is
  imported in `Utils.js`
* `content`: Contains static MPDs that serve as input for testcases. These MPDs are served automatically by Karma under
  `/base/test/functional/content/` with CORS headers when functional tests are started.
* `helper`: Helper classes that define constant values and filter the relevant testvectors for a specific testcase.
* `results`: The summary of the test results is placed in this folder.
* `test`: The implementation of the testcases.
* `view`: Customized view for the test execution including a video element.

# Configuration
The main configuration for the test execution is defined in `karma.functional.conf.js`. To adjust the list of
testvectors or the testcases the existing `config/content.js` can be adjusted. As an alternative, include a different
configuration file in `src/Utils.js`. Future additions to the test framework should allow definition of the testfile
to be used directly via command line parameters.

# Test Execution
To execute the functional tests run the following steps:

1. `npm install` to install all dependencies
2. `npm run build` to build the `dist` files of dash.js. 
3. `npm run test-functional-mocha` to execute the tests.
4. The results will be available after the test execution in `test/functional-karma/results`

# Edge on Windows: Widevine CDM requires a persistent browser profile

By default, Karma launches each browser with a throwaway temporary profile. For Microsoft Edge this
breaks Widevine DRM tests: Edge downloads the up-to-date Widevine CDM as a per-profile component
(`<user data dir>\WidevineCdm\<version>\`), and a fresh profile falls back to the outdated CDM
bundled with the Edge installation. That CDM's client certificate has been revoked by Google, so
license servers that enforce certificate revocation reject every license request (e.g.
`cwip-shaka-proxy.appspot.com` returns 500 `ACCESS_DENIED`, Axinom returns 400 with
`x-axdrm-errormessage: ... DRM client models with revoked certificates are not allowed to receive
licenses`).

In addition, Edge renders protected content through Media Foundation and enforces the license's
output-protection policy via the display driver (OPM/HDCP). **DRM tests on Edge must run in an
unlocked console session with an active display.** If the workstation is locked, the displays are
off, or the session is an RDP session, every vector whose license requires output protection fails
with `MEDIA_ERR_DECODE ... MediaFoundationRenderer error: kOnPlaybackError (0xC0262500 /
"The driver does not support OPM")`. Affected in the smoke suite: the Axinom `v7-MultiDRM-*` and
the LiveSim2 EZDRM vectors; not affected: Angel-One and the Axinom cbcs single-key vector, whose
licenses allow unprotected outputs. This is an environment condition, not a player or test defect.

Therefore the `edge_custom` launcher in `config/test-configurations/local-windows.json` sets
`edgeDataDir` to a persistent profile directory. One-time setup on a new machine: seed that
directory with the current component CDM by copying `%LOCALAPPDATA%\Microsoft\Edge\User
Data\WidevineCdm\<version>` to `<edgeDataDir>\WidevineCdm\<version>` (or launch Edge once with
`--user-data-dir=<edgeDataDir>` and update the "Widevine Content Decryption Module" on
`edge://components`). Because the profile persists, Edge keeps the CDM updated on its own
afterwards. Chrome and Firefox are not affected: their current CDMs ship with the browser
installation or are fetched into the temporary profile on demand.
