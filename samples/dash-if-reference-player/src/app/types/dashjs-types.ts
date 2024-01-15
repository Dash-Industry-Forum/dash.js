/** Augment dashjs in order to add or change it's declarations */

  export interface Period {
    id: string;
    index: number;
    duration: number;
    start: number;
    mpd: object;
  }

  export interface HTTPRequest {
    tcpid: any;
    type: string;
    url: string;
    actualurl: any;
    range: any;
    trequest: Date;
    tresponse: Date;
    responsecode: number;
    interval: number;
    trace: object;
    _stream: string;
    _tfinish: Date;
    _mediaduration: number;
    _quality: number;
    _responseHeaders: string;
    _serviceLocation: string;
  }
