import { CommonMediaRequest, CommonMediaResponse, RequestInterceptor, ResponseInterceptor } from '@svta/common-media-library/request'
import { CmcdObjectType } from '@svta/common-media-library/cmcd'
import * as dashjs from 'dashjs'

declare global {
  interface Window {
    player?: dashjs.MediaPlayerClass
  }
}

export class App {

  player: dashjs.MediaPlayerClass | null = null

  mpd: string = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd'

  constructor() {
  }
  
  public init(): void {
    this.player = dashjs.MediaPlayer().create()
    this.player.initialize(document.querySelector('video') as HTMLMediaElement, this.mpd, true)

    // Add request plugin to override request url for video segment requests only
    this.addRequestInterceptor()

    // Add response plugin to add response header
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