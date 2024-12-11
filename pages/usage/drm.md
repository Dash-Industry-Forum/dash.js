---
layout: default 
title: Digital Rights Management (DRM)
parent: Usage
---

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# Digital Rights Management (DRM)

dash.js offers support for playback of DRM protected content. In this context, multiple adjustments can be made.

## DRM Examples

Multiple samples implementing the functionalities described in this documentation can be found in
the [DRM section](http://reference.dashif.org/dash.js/nightly/samples/).

## License server settings

In order to specify the license server for a DRM system use the `serverURL` attribute:

```js
const protData = {
    "com.widevine.alpha": {
        "serverURL": "https://drm-widevine-licensing.axtest.net/AcquireLicense"
    },
    "com.microsoft.playready": {
        "serverURL": "https://drm-playready-licensing.axtest.net/AcquireLicense"
    }
};
player.setProtectionData(protData);
```

## Key system priority

In some cases the underlying platform supports multiple DRM systems, for instance Widevine and Playready. To prioritize
a specific system in the player's selection process use the `priority` attribute. A lower value means a higher priority.
In the example below, dash.js checks for the support of `com.widevine.alpha` prior to `com.microsoft.playready`.

```js
const protData = {
    "com.widevine.alpha": {
        "serverURL": "someurl",
        "priority": 1
    },
    "com.microsoft.playready": {
        "serverURL": "someurl",
        "priority": 2
    }
}
player.setProtectionData(protData)
```

## Key System String - Priority

In some cases, multiple key system strings map to the same `uuid/schemeIdUri` of a DRM system. As an example, multiple
platforms support the call to `requestMediaKeySystemAccess` for the Playready DRM system using the system
strings `com.microsoft.playready` and `com.microsoft.playready.recommendation`. A detailed explanation is
given [here](https://github.com/Dash-Industry-Forum/dash.js/issues/3852#issuecomment-1020455199)
and [here](https://github.com/Dash-Industry-Forum/dash.js/issues/3852#issuecomment-1020301841).

dash.js allows the application to define a system string priority for each key system as part of the protection data:

````js
var protData = {
  'com.widevine.alpha': {
    'serverURL': 'https://drm-widevine-licensing.axtest.net/AcquireLicense',
    'systemStringPriority': [
      'com.widevine.something',
      'com.widevine.alpha'
    ]
  },
  'com.microsoft.playready': {
    'serverURL': 'https://drm-playready-licensing.axtest.net/AcquireLicense',
    'systemStringPriority': [
      'com.microsoft.playready.something',
      'com.microsoft.playready.recommendation',
      'com.microsoft.playready.hardware',
      'com.microsoft.playready'
    ]
  }
};
````

## DRM specific headers

License servers might require custom headers in order to provide a valid license. dash.js allows the addition of custom
headers using the `httpRequestHeaders` attribute:

```js
const protData = {
  "com.microsoft.playready": {
    "serverURL": "https://drm-playready-licensing.axtest.net/AcquireLicense",
    "httpRequestHeaders": {
      "custom-header": "data"
    }
  }
};
player.setProtectionData(protData)
```

## Robustness levels (Hard- & Software DRM)

Some DRM systems like Widevine require specific robustness levels to enable L1-L3 DRM playback. The robustness level can
be set as part of the protection data in the following way:

````js
const protData = {
  "com.widevine.alpha": {
    "serverURL": "https://drm-widevine-licensing.axtest.net/AcquireLicense",
    "audioRobustness": "SW_SECURE_CRYPTO",
    "videoRobustness": "HW_SECURE_ALL"
  }
}
````

## License server url via MPD

DRM systems generally use the concept of license requests as the mechanism for obtaining content keys and associated
usage constraints. For DRM systems that use this concept, one or more `dashif:Laurl` elements may be present under the
ContentProtection descriptor, with the value of the element being the URL to send license requests to. An example looks
the following:

````xml
<ContentProtection
        schemeIdUri="urn:uuid:d0ee2730-09b5-459f-8452-200e52b37567"
        value="FirstDRM 2.0">
  <cenc:pssh>
    YmFzZTY0IGVuY29kZWQgY29udGVudHMgb2YgkXBzc2iSIGJveCB3aXRoIHRoaXMgU3lzdGVtSUQ=
  </cenc:pssh>
  <dashif:Authzurl>https://example.com/tenants/5341/authorize</dashif:Authzurl>
  <dashif:Laurl>https://example.com/AcquireLicense</dashif:Laurl>
</ContentProtection>
````

Note: dash.js prioritizes the license server urls in the following order:

1. URL provided via the the API
2. URL provided via the MPD
3. URL provided via pssh

## Ignoring init data from the PSSH

By default, dash.js listens to `needkey` and `encrypted` events thrown by the EME. In case the init data has changed a
new key session is created and a license request is triggered. In order to ignore DRM init data coming from
initialization and media segments the settings object needs to be adjusted:

````js
player.updateSettings({
  streaming: {
    protection: {
      ignoreEmeEncryptedEvent: true
    }
  }
})
````

## Modifying the license payload

dash.js allows the modification of the license request payload and the license response body.

### License request modification

In order to modify the license request, filter functions can be added and removed dynamically.

Note: The filter functions are reset when calling `player.destroy()`.

```js
const player = dashjs.MediaPlayer().create();
const callback = (payload) => {
  return new Promise((resolve, reject) => {
    resolve(payload)
  })
}
player.initialize(video, url, false);
player.registerLicenseRequestFilter(callback)
```

```js
player.unregisterLicenseRequestFilter(callback)
```

The registered functions are called within the `ProtectionController` class before the license request is send to the
license server

```js
let licenseRequest = new LicenseRequest(url, reqMethod, responseType, reqHeaders, withCredentials, messageType, sessionId, reqPayload);
applyFilters(licenseRequestFilters, licenseRequest).then(() => {
    doLicenseRequest(licenseRequest, LICENSE_SERVER_REQUEST_RETRIES, timeout, onLoad, onAbort, onError);
});
```

### License response modification

In order to modify the license response, filter functions can be added and removed dynamically:

```js
const player = dashjs.MediaPlayer().create();
const callback = (payload) => {
    return new Promise((resolve, reject) => {
        resolve(payload)
    })
}
player.initialize(video, url, false);
player.registerLicenseResponseFilter(callback)
```

```js
player.unregisterLicenseResponseFilter(callback)
```

## Keeping the MediaKeySession

The ProtectionController and the created MediaKeys and MediaKeySessions can be preserved during the MediaPlayer
lifetime. As a consequence, only the first playback attempt for a DRM protected stream will result in a license request.
For any subsequent playback attempt of the same content the existing MediaKeySession is reused and no additional license
requests are performed.

To enable MediaKeySession reusage `keepProtectionMediaKeys` needs to be enabled.

```js
player.updateSettings({
  streaming: {
    protection: {
      keepProtectionMediaKeys: true
    }
  }
})
```

## Different versions of the EME

The [EME](https://www.w3.org/TR/encrypted-media/) is the API that enables playback of protected content in the browser.
It provides the necessary function calls to discover and interact with the underlying DRM system. Like any other API,
EME changed over time and the current version is a lot different compared to the one in 2013. While desktop and mobile
browsers are frequently updated, some embedded devices and set-top boxes are still running on outdated or even
customized versions of the EME. For that reason dash.js detects the EME version on the client and triggers the right API
functions [1].

By default, dash.js ships with support for three different versions of EME:

* **ProtectionModel_01b.js**: initial implementation of the EME, implemented by Google Chrome prior to version 36. This
  EME version is not-promised based and uses outdated or prefixed events like “needkey” or “webkitneedkey”.
* **ProtectionModel_3Feb2014.js**:  implementation of EME APIs as of the 3 Feb 2014 state of the specification.
  Implemented by Internet Explorer 11 (Windows 8.1).
* **ProtectionModel_21Jan2015.js**: most recent EME implementation. Latest changes in the EME specification are added to
  this model and It supports the promised-based EME function calls.

The detection of the appropriate EME version is done automatically in `Protection.js`:

```js
if ((!videoElement || videoElement.onencrypted !== undefined) &&
    (!videoElement || videoElement.mediaKeys !== undefined)) {
    logger.info('EME detected on this user agent! (ProtectionModel_21Jan2015)');
    return ProtectionModel_21Jan2015(context).create();
} else if (getAPI(videoElement, APIS_ProtectionModel_3Feb2014)) {
    logger.info('EME detected on this user agent! (ProtectionModel_3Feb2014)');
    return ProtectionModel_3Feb2014(context).create();
} else if (getAPI(videoElement, APIS_ProtectionModel_01b)) {
    logger.info('EME detected on this user agent! (ProtectionModel_01b)');
    return ProtectionModel_01b(context).create();
} else {
    logger.warn('No supported version of EME detected on this user agent! - Attempts to play encrypted content will fail!');
    return null;
}
```


## References

[1] [dash.js: License acquisition for multiple EME versions](https://websites.fraunhofer.de/video-dev/dash-js-license-acquisition-for-multiple-eme-versions/)
