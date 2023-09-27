import { CommonMediaRequest, CommonMediaResponse, RequestPlugin, ResponsePlugin } from '@svta/common-media-library/request'
import { CmcdObjectType } from '@svta/common-media-library/cmcd'
import * as dashjs from 'dashjs'

declare global {
  interface Window {
    player?: dashjs.MediaPlayerClass
  }
}

export class App {

  player: dashjs.MediaPlayerClass | null = null

  constructor() {
    this.initDashPlayer()
  }
  
  public play() {
    if (!this.player) {
      return
    }
    this.player.attachSource('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd')
  }

  public stop() {
    if (!this.player) {
      return
    }
    this.player.attachSource('')
  }

  private initDashPlayer(): void {
    this.player = dashjs.MediaPlayer().create()
    this.player.initialize(document.querySelector('video') as HTMLMediaElement)

    // Add request plugin to override request url for video segment requests only
    this.addRequestPlugin()

    // Add response plugin to add response header
    this.addResponsePlugin()

    window.player = this.player
  }

  private addRequestPlugin() {
    if (!this.player) {
      return
    }
    const plugin: RequestPlugin = (request: CommonMediaRequest) => {
      if (request.cmcd?.ot === CmcdObjectType.VIDEO) {
        request.url += (request.url.includes('?') ? '&' : '?') + 'request-plugin=true'
        console.log(request.url)
      }
      return Promise.resolve()
    }
    this.player.registerRequestPlugin(plugin)
  }

  private addResponsePlugin() {
    if (!this.player) {
      return
    }
    const plugin: ResponsePlugin = (response: CommonMediaResponse) => {
      if (!response.headers) {
        response.headers = {}
      }
      response.headers['response-plugin'] = 'true'
      return Promise.resolve()
    }
    this.player.registerResponsePlugin(plugin)
  }
}