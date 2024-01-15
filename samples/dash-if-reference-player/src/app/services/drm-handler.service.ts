//@ts-nocheck
import { Injectable } from '@angular/core';
import '../types/dashjs-types';
import { PlayerService } from './player.service';

interface AudioRobustness {
    value: string,
    viewValue: string
}

interface VideoRobustness {
    value: string,
    viewValue: string
}

@Injectable({
  providedIn: 'any'
})
export class DrmHandlerService {

  protectionData = {};
  prioritiesEnabled = false;

  // DRM Objects
  drmPlayready: any = {
    isActive: false,
    drmKeySystem: 'com.microsoft.playready',
    licenseServerUrl: '',
    httpRequestHeaders: {},
    httpTimeout: 5000,
    audioRobustness: '',
    videoRobustness: '',
    priority: 1
  };

  drmWidevine: any = {
    isActive: false,
    drmKeySystem: 'com.widevine.alpha',
    licenseServerUrl: '',
    httpRequestHeaders: {},
    httpTimeout: 5000,
    audioRobustness: '',
    videoRobustness: '',
    priority: 0
  };

  drmClearkey: any = {
    isActive: false,
    drmKeySystem: 'org.w3.clearkey',
    licenseServerUrl: '',
    httpRequestHeaders: {},
    httpTimeout: 5000,
    kid: '',
    key: '',
    inputMode: false,
    priority: 2
  };

  drmList = [this.drmPlayready, this.drmWidevine, this.drmClearkey];

  playreadyRequestHeaders: any = [];
  widevineRequestHeaders: any = [];
  clearkeyRequestHeaders: any = [];

  additionalClearkeyPairs: any = [];
  //SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL.
  selectedAudioRobustnessPlayready: string = '';
  selectedVideoRobustnessPlayready: string = '';
  playreadyRobustnessSettings: VideoRobustness[] = [
    {value: '', viewValue: 'Default'},
    {value: '3000', viewValue: 'SL3000'},
    {value: '2000', viewValue: 'SL2000'},
    {value: '150',  viewValue: 'SL150'}
  ]

  selectedAudioRobustnessWidevine:  string = '';
  audioRobustnessSettings: AudioRobustness[] = [
    {value: '', viewValue: 'Default'},
    {value: 'SW_SECURE_CRYPTO', viewValue: 'SW Secure Crypto'},
    {value: 'SW_SECURE_DECODE', viewValue: 'SW Secure Decode'},
    {value: 'HW_SECURE_CRYPTO', viewValue: 'HW Secure Crypto'},
    {value: 'HW_SECURE_DECODE', viewValue: 'HW Secure Decode'},
    {value: 'HW_SECURE_ALL'   , viewValue: 'HW Secure All'},
  ]

  selectedVideoRobustnessWidevine:  string = '';
  videoRobustnessSettings: VideoRobustness[] = [
    {value: '', viewValue: 'Default'},
    {value: 'SW_SECURE_CRYPTO', viewValue: 'SW Secure Crypto'},
    {value: 'SW_SECURE_DECODE', viewValue: 'SW Secure Decode'},
    {value: 'HW_SECURE_CRYPTO', viewValue: 'HW Secure Crypto'},
    {value: 'HW_SECURE_DECODE', viewValue: 'HW Secure Decode'},
    {value: 'HW_SECURE_ALL'   , viewValue: 'HW Secure All'},
  ]


  constructor(public playerService: PlayerService) { }

  /** Handle form input */
  setDrm(): any{

    const drmInputs = [this.drmPlayready, this.drmWidevine, this.drmClearkey];
    const protectionData: any = {};

    this.handleRequestHeader();
    this.handleClearkeys();

    for (const input of drmInputs){
        if (input.isActive){

            // Check if the provided DRM is Clearkey and whether KID=KEY or LicenseServer + Header is selected; Default is KID=KEY
           if(input.hasOwnProperty('inputMode') && input.inputMode === false){
            
                //Check clearkeys has at least one entry
                if(input.clearkeys !== {}){
                    // Check if priority is enabled
                    protectionData[input.drmKeySystem] = {
                        clearkeys : {},
                        priority : 0
                    };
                    if (this.prioritiesEnabled){
                        for (const key in input.clearkeys){
                            protectionData[input.drmKeySystem].clearkeys[key] = input.clearkeys[key];
                        }
                        protectionData[input.drmKeySystem].priority = parseInt(input.priority);
                    }

                    else {
                        for (const key in input.clearkeys){
                            protectionData[input.drmKeySystem].clearkeys[key] = input.clearkeys[key];
                        }
                    }

                    for (const key in input){
                        if (key !== 'isActive' &&
                            key !== 'drmKeySystem' &&
                            key !== 'licenseServerUrl' &&
                            key !== 'httpRequestHeaders' &&
                            key !== 'priority' &&
                            key !== 'kid' &&
                            key !== 'key' &&
                            key !== 'inputMode'){
                                protectionData[input.drmKeySystem][key] = input[key];
                            }
                    }

                    // !angular.equals(input.httpRequestHeaders, {})
                    if(input.httpRequestHeaders !== {}){
                        protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders; 
                    }

                    if(input.httpTimeout){
                        protectionData[input.drmKeySystem]['httpTimeout'] = input.httpTimeout;
                    }

                    if(input.audioRobustness){
                        protectionData[input.drmKeySystem]['audioRobustness'] = input.audioRobustness;
                    }

                    if(input.videoRobustness){
                        protectionData[input.drmKeySystem]['videoRobustness'] = input.videoRobustness;
                    }
                }
                else {
                    alert('Kid and Key must be specified!');
                }

            }

            else{
              // Validate URL. If the provided information is not a valid url, the DRM is skipped.
              if (this.isValidURL(input.licenseServerUrl)){
                // Check if DRM-Priorisation is enabled
                if (this.prioritiesEnabled){
                    protectionData[input.drmKeySystem] = {
                      serverURL: input.licenseServerUrl,
                      priority: parseInt(input.priority)
                    };
                    if (input.httpRequestHeaders !== {}) {
                    protectionData[input.drmKeySystem].httpRequestHeaders = input.httpRequestHeaders;
                    }
                    if(input.httpRequestHeaders !== {}){
                        protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders;
                    }

                    if(input.httpTimeout){
                        protectionData[input.drmKeySystem]['httpTimeout'] = input.httpTimeout;
                    }

                    if(input.audioRobustness){
                        protectionData[input.drmKeySystem]['audioRobustness'] = input.audioRobustness;
                    }

                    if(input.videoRobustness){
                        protectionData[input.drmKeySystem]['videoRobustness'] = input.videoRobustness;
                    }
                     
                }
                else {
                protectionData[input.drmKeySystem] = {
                    serverURL: input.licenseServerUrl,
                  };
                }

                for (const key in input){
                    if (key !== 'isActive' &&
                        key !== 'drmKeySystem' &&
                        key !== 'licenseServerUrl' &&
                        key !== 'httpRequestHeaders' &&
                        key !== 'priority'){
                            protectionData[input.drmKeySystem][key] = input[key];
                        }
                }

                // Only set request header if any have been specified
                if(input.httpRequestHeaders !== {}){
                   protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders; 
                } 

                if(input.httpTimeout){
                    protectionData[input.drmKeySystem]['httpTimeout'] = input.httpTimeout;
                }

                if(input.audioRobustness){
                    protectionData[input.drmKeySystem]['audioRobustness'] = input.audioRobustness;
                }

                if(input.videoRobustness){
                    protectionData[input.drmKeySystem]['videoRobustness'] = input.videoRobustness;
                }
                  
              }
              else {
                console.log(input.licenseServerUrl, 'is not a valid url!');
              }

            }
        }
    }

    this.protectionData = protectionData;
    this.playerService.player.setProtectionData(protectionData);
    return protectionData;
}

addPopupInput(keySystem: any): void {
    switch (keySystem){
        case 'playready':
            this.playreadyRequestHeaders.push({
                id: this.playreadyRequestHeaders.length + 1,
                key: '',
                value: ''
            });
            break;
        case 'widevine':
            this.widevineRequestHeaders.push({
                id: this.widevineRequestHeaders.length + 1,
                key: '',
                value: ''
            });
            break;
        case 'clearkey':
            this.clearkeyRequestHeaders.push({
                id: this.clearkeyRequestHeaders.length + 1,
                key: '',
                value: ''
            });
            break;
        case 'additionalClearkeys':
            this.additionalClearkeyPairs.push({
                id: this.additionalClearkeyPairs.length + 1,
                kid: '',
                key: ''
            });
    }
}

removePopupInput(keySystem: any, index: number): void{
    switch (keySystem){
        case 'playready':
            this.playreadyRequestHeaders.splice(index, 1);
            break;
        case 'widevine':
            this.widevineRequestHeaders.splice(index, 1);
            break;
        case 'clearkey':
            this.clearkeyRequestHeaders.splice(index, 1);
            break;
        case 'additionalClearkeys':
            this.additionalClearkeyPairs.splice(index, 1);
            break;
    }

}

handleRequestHeader(): void{
    // Initialize with current headers as empty
    this.drmPlayready.httpRequestHeaders = {};
    this.drmWidevine.httpRequestHeaders = {};
    this.drmClearkey.httpRequestHeaders = {};

    // fill headers with current inputs
    for (const header of this.playreadyRequestHeaders){
        this.drmPlayready.httpRequestHeaders[header.key] = header.value;
    }
    for (const header of this.widevineRequestHeaders){
        this.drmWidevine.httpRequestHeaders[header.key] = header.value;
    }
    for (const header of this.clearkeyRequestHeaders){
        this.drmClearkey.httpRequestHeaders[header.key] = header.value;
    }
}

/** Handle multiple clearkeys */
handleClearkeys(): void{
    // Initialize with empty
    this.drmClearkey.clearkeys = {};

    // Set default KID=KEY pair
    if (this.drmClearkey.kid !== '' && this.drmClearkey.key !== ''){
        this.drmClearkey.clearkeys[this.drmClearkey.kid] = this.drmClearkey.key;
    }
    // fill drmClearkey objects "clearkeys" property
    for (const clearkey of this.additionalClearkeyPairs){
        this.drmClearkey.clearkeys[clearkey.kid] = clearkey.key;
    }
    // if clearkey property is empty, alert
    if (this.additionalClearkeyPairs === {}){
        alert('You must specify at least one KID=KEY pair!');
    }
}

/** Handle inherent protection data passed by selectedItem */
handleProtectionData(protectionData: any){
    for(let data in protectionData){
        switch(true){
            case data.includes('playready'):
                // Set DRM to active
                this.drmPlayready.isActive = true;
                // Fill the drmPlayready object with data to be used by setDRM() later.
                this.drmPlayready.licenseServerUrl = protectionData[data].serverURL;
                for (const header in protectionData[data].httpRequestHeaders){
                        this.playreadyRequestHeaders.push({
                            id: this.playreadyRequestHeaders.length + 1,
                            key: header,
                            value: protectionData[data].httpRequestHeaders[header]
                        });
                }
                // Add any additional parameters
                for (const parameter in protectionData[data]){
                    if (parameter !== 'serverURL' &&
                        parameter !== 'httpRequestHeaders'){
                            this.drmPlayready[parameter] = protectionData[data][parameter];
                        }
                }
                break;

            case data.includes('widevine'):
                // Set DRM to active
                this.drmWidevine.isActive = true;
                // Fill the drmWidevine object with data to be used by setDRM() later
                this.drmWidevine.licenseServerUrl = protectionData[data].serverURL;
                for (const header in protectionData[data].httpRequestHeaders){
                    this.widevineRequestHeaders.push({
                        id: this.widevineRequestHeaders.length + 1,
                        key: header,
                        value: protectionData[data].httpRequestHeaders[header]
                    });
                }
                // Add any additional parameters
                for (const parameter in protectionData[data]){
                    if (parameter !== 'serverURL' &&
                        parameter !== 'httpRequestHeaders'){
                            this.drmWidevine[parameter] = protectionData[data][parameter];
                        }
                }
                break;

            case data.includes('clearkey'):
                // Set DRM to active
                this.drmClearkey.isActive = true;
                // Handle clearkey data if specified using a license server
                if (protectionData[data].serverURL !== undefined){
                    this.drmClearkey.licenseServerUrl = protectionData[data].serverURL;
                    for (const header in protectionData[data].httpRequestHeaders){
                        this.clearkeyRequestHeaders.push({
                            id: this.clearkeyRequestHeaders.length + 1,
                            key: header,
                            value: protectionData[data].httpRequestHeaders[header]
                        });
                    }
                }
                // Handle clearkey data if specified using KID=KEY.
                else {
                    let first = true;
                    if (protectionData[data].clearkeys !== {}){
                        for (const kid in protectionData[data].clearkeys){
                            // For the first KID=Key pair, set drmClearkey properties so that it shows in the main text boxes
                            if (first === true){
                                this.drmClearkey.kid = kid;
                                this.drmClearkey.key = protectionData[data].clearkeys[kid];
                                delete protectionData[data].clearkeys[kid];
                                first = false;
                            }
                            else if (protectionData[data].clearkeys !== {}) {
                                this.additionalClearkeyPairs.push({
                                    id: this.additionalClearkeyPairs.length + 1,
                                    kid,
                                    key: protectionData[data].clearkeys[kid]
                                });
                            }
                        }
                    }
                }
                // Add any additional parameters
                for (const parameter in protectionData[data]){
                    if (parameter !== 'serverURL' &&
                        parameter !== 'httpRequestHeaders' &&
                        parameter !== 'clearkeys'){
                            this.drmWidevine[parameter] = protectionData[data][parameter];
                        }
                }
                break;
        }
    }
}

/** Test if provided string is a URL */
isValidURL(str: string): boolean {
    const res = str.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return (res !== null);
  }

/** Toggle between KID=KEY and Licenseserver Clearkey specification */
toggleInputMode(): void{
    this.drmClearkey.inputMode = !this.drmClearkey.inputMode;
}

openDialogue(keySystem: string): void{
    switch (keySystem){
        case 'playready':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('playreadyRequestHeaderDialogue')!.style.display = 'inline-block';
            break;
        case 'widevine':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('widevineRequestHeaderDialogue')!.style.display = 'block';
            break;
        case 'clearkey':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('clearkeyRequestHeaderDialogue')!.style.display = 'block';
            break;
        case 'additionalClearkeys':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('additionalClearkeysDialogue')!.style.display = 'block';
            break;
    }
}

closeDialogue(keySystem: string): void{
    switch (keySystem){
        case 'playready':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('playreadyRequestHeaderDialogue')!.style.display = 'none';
            break;
        case 'widevine':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('widevineRequestHeaderDialogue')!.style.display = 'none';
            break;
        case 'clearkey':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('clearkeyRequestHeaderDialogue')!.style.display = 'none';
            break;
        case 'additionalClearkeys':
            // tslint:disable-next-line: no-non-null-assertion
            document.getElementById('additionalClearkeysDialogue')!.style.display = 'none';
    }
}

popUpListener(): void{
  window.addEventListener('click',  (event: MouseEvent) => {
    if (event.target === document.getElementById('playreadyRequestHeaderDialogue') ||
       event.target === document.getElementById('widevineRequestHeaderDialogue')  ||
       event.target === document.getElementById('clearkeyRequestHeaderDialogue')  ||
       event.target === document.getElementById('additionalClearkeysDialogue')    ){
           // @ts-ignore
           event.target.style.display = 'none';
    }
  });
}

}
