import { Injectable } from '@angular/core';
import '../types/dashjs-types';
import { PlayerService } from './player.service';

@Injectable({
  providedIn: 'any'
})
export class QueryHandlerService {
  private activeDrms: any = {};

  constructor(public playerService: PlayerService) { }

  parseBoolean(value: string | boolean): boolean{
    return value === true || value === 'true';
  }
  /** Check if a string is a number */
  checkIfNumber(value: string): boolean {
    let regex = new RegExp('[+-]?([0-9]*[.])?[0-9]+');
    if (value.match(regex)) { return true; }
    return false;
  }

  /** Cast string to number | boolean | string */
  typeCastFromString(value: string): number | boolean | string {
    if (value === 'true' || value === 'false') { return this.parseBoolean(value); }
    if (this.checkIfNumber(value)) { return parseFloat(value); }
    return value;
  }

  /** Copy a URL containing the current settings as query Parameters to the Clipboard */
  copyQueryUrl(externalSettingsString: string): void{
    let currentSetting = this.playerService.player.getSettings();
    currentSetting = this.makeSettingDifferencesObject(currentSetting, this.playerService.defaultSettings);
    let url = window.location.protocol + '//' + window.location.host + window.location.pathname + '?';
    let queryString = url + externalSettingsString + '@&' + this.toQueryString(currentSetting);

    if(queryString.slice(-1) === '&') queryString = queryString.slice(0, -1);

    this.checkQueryLength(queryString);

    queryString = queryString.split(/&&*/).join('&');
    
    const element = document.createElement('textarea');
    element.value = queryString;
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
  }

  /** Transform the current Settings into a nested query-string format */
  toQueryString(settings: any, prefix?: any): string {
    let urlString: any = [];
    for (let setting in settings){
      if (settings.hasOwnProperty(setting)){
        let k = prefix ? prefix + '.' + setting : setting;
        let v = settings[setting];
        urlString.push((v !== null && typeof v === 'object') ?
          this.toQueryString(v, k) :
          encodeURIComponent(decodeURIComponent(k)) + "=" + encodeURIComponent(decodeURIComponent(v)));
      }
    }
    // Make the string, then remove all cases of && caused by empty settings
    return urlString.join('&').split(/&&*/).join('&');
  }

  /** Transform query-string into Object  */
  toSettingsObject(queryString:any){
    //Remove double & in case of empty settings field
    var querySegments = queryString.split('&&').join('&');
    querySegments = queryString.split('&');
    let settingsObject:any = {};
    let drmObject:any = {};
    let prioritiesEnabled = false;

    for (let segment of querySegments){
      let[key, value] = segment.split('=');
      this.resolveQueryNesting(settingsObject, key, value);
    }

    for(let settingCategory of Object.keys(settingsObject)){
      //@ts-ignore
      if(settingsObject !== {} && 
        (settingCategory === 'playready' ||
        settingCategory === 'widevine' ||
        settingCategory === 'clearkey') &&
        settingsObject[settingCategory].isActive){
          drmObject[settingCategory] = settingsObject[settingCategory];
          this.activeDrms[settingCategory] = settingsObject[settingCategory];
          // this.activeDrms[settingCategory] = settingsObject[settingCategory].isActive;
          delete settingsObject.settingCategory;

      }
    }
    prioritiesEnabled = settingsObject.prioritiesEnabled;
    drmObject = this.makeProtectionData(drmObject, prioritiesEnabled);
    return [settingsObject, drmObject];
  }

  /** Resolve nested query parameters */
  resolveQueryNesting(base: any, nestedKey: any, value?: any): any{
    let keyList: any = nestedKey.split('.');
    let lastProperty = value !== null ? keyList.pop() : false;
    let obj = base;

    // tslint:disable-next-line: prefer-for-of
    for (let key = 0; key < keyList.length; key++){
      base = base[ keyList[key] ] = base [keyList[key]] || {};
    }

    value = this.handleQueryParameters(value);

    if (lastProperty) { base = base [lastProperty] = value; }

    return obj;
  }

  /** Takes a string value extracted from the query-string and transforms it into the appropriate type */
  handleQueryParameters(value: string): any{
    let typedValue: any;
    let integerRegEx = /^\d+$/;
    let floatRegEx = /^\d+.\d+$/;
    if (value === 'true' || value === 'false'){
      typedValue = this.parseBoolean(value);
    }
    else if (value === 'NaN') { typedValue = NaN; }
    else { integerRegEx.test(value) ? typedValue = parseInt(value) :
         (floatRegEx.test(value) ? typedValue = parseFloat(value) : typedValue = value);
 }

    return typedValue;
  }

  makeProtectionData(drmObject: any, prioritiesEnabled: boolean): any{
    let queryProtectionData: any = {};

    for(let drm in drmObject){
      if(drmObject[drm].hasOwnProperty('inputMode') && drmObject[drm].inputMode === false){
        //@ts-ignore
        if(drmObject[drm].clearkeys !== {}){
          queryProtectionData[drmObject[drm].drmKeySystem] = {
            clearkeys : {},
            priority : 0
          };
          if (prioritiesEnabled){
            for (let key in drmObject[drm].clearkeys){
              queryProtectionData[drmObject[drm].drmKeySystem].clearkeys[key] = drmObject[drm].clearkeys[key];
            }
            queryProtectionData[drmObject[drm].drmKeySystem].priority = parseInt(drmObject[drm].priority);
          }


          else {
            for (let key in drmObject[drm].clearkeys){
                queryProtectionData[drmObject[drm].drmKeySystem].clearkeys[key] = drmObject[drm].clearkeys[key];
            }
          }

          for (let key in drmObject[drm]){
            if (key !== 'isActive' &&
                key !== 'drmKeySystem' &&
                key !== 'licenseServerUrl' &&
                key !== 'httpRequestHeaders' &&
                key !== 'priority' &&
                key !== 'kid' &&
                key !== 'key' &&
                key !== 'inputMode'){
                    queryProtectionData[drmObject[drm].drmKeySystem][key] = drmObject[drm][key];
            }
          }
          //@ts-ignore
          if(drmObject[drm].httpRequestHeaders !== {}){
            queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders; 
          }

          if(drmObject[drm].httpTimeout){
            queryProtectionData[drmObject[drm].drmKeySystem]['httpTimeout'] = drmObject[drm].httpTimeout;
          }

          if(drmObject[drm].audioRobustness){
            queryProtectionData[drmObject[drm].drmKeySystem]['audioRobustness'] = drmObject[drm].audioRobustness;
          }

          if(drmObject[drm].videoRobustness){
            queryProtectionData[drmObject[drm].drmKeySystem]['videoRobustness'] = drmObject[drm].videoRobustness;
          }
          
        }  
        else {
          alert('Kid and Key must be specified!');
        }

      }

      else{
        // check if priority is enabled
        if (prioritiesEnabled){
          queryProtectionData[drmObject[drm].drmKeySystem] = {
            serverURL: decodeURIComponent(drmObject[drm].licenseServerUrl),
            priority: parseInt(drmObject[drm].priority)
          };
          //@ts-ignore
          if (drmObject[drm].httpRequestHeaders !== {}) {
          queryProtectionData[drmObject[drm].drmKeySystem].httpRequestHeaders = drmObject[drm].httpRequestHeaders;
          }
          //@ts-ignore
          if(drmObject[drm].httpRequestHeaders !== {})
          queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders;
           
        }
        else {
        queryProtectionData[drmObject[drm].drmKeySystem] = {
            serverURL: decodeURIComponent(drmObject[drm].licenseServerUrl),
          };
        }

        for (let key in drmObject[drm]){
            if (key !== 'isActive' &&
                key !== 'drmKeySystem' &&
                key !== 'licenseServerUrl' &&
                key !== 'httpRequestHeaders' &&
                key !== 'priority'){
                    queryProtectionData[drmObject[drm].drmKeySystem][key] = drmObject[drm][key];
                }
        }

        // Only set request header if any have been specified
        //@ts-ignore
        if(drmObject[drm].httpRequestHeaders !== {}){
          queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders; 
        }
      }
    }
    return queryProtectionData;
  }

  
  makeSettingDifferencesObject(settings: any, defaultSettings: any): any {
    var settingDifferencesObject: any = {};

    if (Array.isArray(settings)) {
      return this._arraysEqual(settings, defaultSettings) ? {} : settings;
  }

  for (var setting in settings) {
      if (typeof defaultSettings[setting] === 'object' && defaultSettings[setting] !== null && !(defaultSettings[setting] instanceof Array)) {
          settingDifferencesObject[setting] = this.makeSettingDifferencesObject(settings[setting], defaultSettings[setting]);
      } else if (settings[setting] !== defaultSettings[setting]) {
          if (Array.isArray(settings[setting])) {
              settingDifferencesObject[setting] = this._arraysEqual(settings[setting], defaultSettings[setting]) ? {} : settings[setting];
          } else {
              settingDifferencesObject[setting] = settings[setting];
          }

      }
  }

    return settingDifferencesObject;
  }

  checkQueryLength(string:string) {
    var maxUrlLength = 30000;
    // @ts-ignore
    if (window.document.documentMode) {
        maxUrlLength = 2083;
        //Alt: "Due to the low url character limit on IE, please use the config file method instead."
        //Alt2: If IE detected, copy settings-file content instead of creating a url, alert userto the change.
    }
    if (string.length > maxUrlLength) {
        alert('The length of the URL may exceed the Browser url character limit.')
    }
}

  _arraysEqual(a: Array<any>, b: Array<any>) {
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
  }

  getActiveDrms(){
    // console.log(this.activeDrms);
    return this.activeDrms;
  }
}
