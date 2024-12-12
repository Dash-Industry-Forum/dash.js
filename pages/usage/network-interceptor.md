---
layout: default
title: Network Interceptor
parent: Usage
---

# Network Interceptor

In some cases it might be necessary to modify the outgoing network requests or the incoming network response data. For
that
reason, dash.js provides a network interceptor API that allows applications to intercept and modify network requests and
responses.

## Intercepting network requests

To intercept network requests, the application must register a callback function that will be called before or after the
request is sent. The callback function must return a promise that resolves to the modified request object. The following
example demonstrates how to intercept network requests:

````js
 public init(): void {
                this.player = dashjs.MediaPlayer().create()
                this.player.initialize(document.querySelector('video') as HTMLMediaElement, this.mpd, true)

                /* Add request plugin to override request url for video segment requests only */
                this.addRequestInterceptor()

                /* Add response plugin to add response header */
                this.addResponseInterceptor()

                window.player = this.player
            }

            private addRequestInterceptor() {
                if (!this.player) {
                    return
                }
                const interceptor: RequestInterceptor = (request: CommonMediaRequest) => {
                    if (request.cmcd?.ot === CmcdObjectType.VIDEO) {
                        request.url += (request.url.includes('?') ? '&' : '?') + 'request-interceptor=true'
                        console.log(request.url)
                    }
                    return Promise.resolve(request)
                }
                this.player.addRequestInterceptor(interceptor)
            }

            private addResponseInterceptor() {
                if (!this.player) {
                    return
                }
                const interceptor: ResponseInterceptor = (response: CommonMediaResponse) => {
                    if (!response.headers) {
                        response.headers = {}
                    }
                    response.headers['response-interceptor'] = 'true'
                    return Promise.resolve(response)
                }
                this.player.addResponseInterceptor(interceptor)
            }
        }
````

A fully working example can be found in our [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/network-interceptor.html).
