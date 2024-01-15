import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition
} from '@angular/animations';
import { MatExpansionPanel } from '@angular/material/expansion';
import { PlayerService } from '../../services/player.service';
import { settingGroups} from '../../../assets/settingGroups';
import { QueryHandlerService } from '../../services/query-handler.service';
import { DrmHandlerService } from '../../services/drm-handler.service';
import { hasOwnProperty } from '../../../assets/hasownproperty';
import sources from '../../../assets/sources.json';


@Component({
  selector: 'app-video-configuration',
  templateUrl: './video-configuration.component.html',
  styleUrls: ['./video-configuration.component.css'],
  /*
   * Need to remove view encapsulation so that dynamic mat elements can be styled. Otherwise, style definitions would
   * have to be defined in global styles.css or deprecated selector ::ng-deep would have to be used.
   */
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('streamsDropdownShowHide', [
      state('true', style({
        /** scaleY(0) <=> scaleY(1) is not animated but set as state to prevent user-interaction with hidden element */
        transform: 'scaleY(1)',
        opacity: 1
      })),
      state('false', style({
        transform: 'scaleY(0)',
        opacity: 0
      })),
      transition('false => true', [
        /**  Set scaleY(1) initially, then start animation */
        style({transform: 'scaleY(1)', opacity: 0}),
        animate(100, style({opacity: 1}))
      ]),
      transition('true => false',
        animate(100, style({opacity: 0}))
        // After the animation, scaleY(0) is set automatically by state declaration
      )
    ]),
    trigger('settingsShowHide', [
      state('true', style({
        /** scaleY(0) <=> scaleY(1) is not animated but set as state to prevent user-interaction with hidden element */
        transform: 'scaleY(1)',
        height: '*'
      })),
      state('false', style({
        transform: 'scaleY(0)',
        height: '0px'
      })),
      transition('false => true', [
        /**  Set scaleY(1) initially, then start animation */
        style({transform: 'scaleY(1)', height: '0px'}),
        animate('300ms ease-in-out', style({height: '*'}))
      ]),
      transition('true => false',
        animate('300ms ease-in-out', style({height: '0px'}))
        /** After the animation, scaleY(0) is set automatically by state declaration */
      )
    ]),
  ]
})

export class VideoConfigurationComponent implements OnInit {
  groups: Array<any> = [];
  JSON = JSON;
  orderGroups = settingGroups;
  srcProvider = sources.provider;
  srcItems = sources.items;
  // ItemSelected is needed to apply additional data from sources.json, eg. protData
  srcItemSelected: object | null = this.srcItems[0].submenu[4];
  srcItemSelectedJSON = JSON.stringify(this.srcItemSelected);
  inputVarStreamAddr = this.srcItems[0].submenu[4].url;
  streamsDropdownIsVisible = false;
  streamsDropdownExpandedPanel: MatExpansionPanel | null = null;
  streamsGroupBy: 'type' | 'provider' = 'type';
  settingsSectionIsVisible : boolean = false;
  protectionData : any = {};

  colorIterator : number = 0;
  badgeColorList : string[] = [
    '#34d8eb',
    '#1c7a85',
    '#0f57db',
    '#8cc3ed'
  ]

  constructor(public playerService: PlayerService, public queryHandler: QueryHandlerService, public drmHandler: DrmHandlerService) {}

  ngOnInit(): void {
    const currentQuery = window.location.search;
    if (currentQuery !== ''){
      this.setQueryData(currentQuery);
    }
    this.groups = Object.entries(this.processSettings());
  }

  ////////////////////////////////////////
  // Player Setup
  ////////////////////////////////////////
  /**
   * Settings Preprocessing: get default Settings, traverse Nested Object and return Object
   * ordered according to our custom order from SettingGroups.js
   */
  processSettings(): object {
    const player = this.playerService.player;
    const defaultSettings = player.getSettings();
    const flattenedSettings: any[] = [];

    // Array with [group, settingName, defaultValue, pathInNestedObject]
    Object.entries(this.flattenObject(defaultSettings)).map(setting => {
      flattenedSettings.push([setting[0].split('.').slice(-2, -1).toString(), setting[0].split('.')
        .slice(-1).toString(), setting[1], setting[0]]);
    });

    // console.log(flattenedSettings)

    // Find Related settings and group the settings
    const res: any[] = [];
    flattenedSettings.forEach(setting => {
      if (!(setting[0] === 'debug' || setting[0] === 'streaming' || setting[0] === 'abr' ||
        setting[0] === 'cmcd')) {
        if (!res[setting[0]]) {
          res[setting[0]] = [];
        }
        const formatted: { [index: string]: any } = {};
        formatted[setting[1]] = [setting[2], setting[3]];
        //console.log(formatted)
        res[setting[0]].push(formatted);
      } else {
        res[setting[1]] = [setting[2], setting[3]];
      }
    });
    
    // try to flatten the object here? Need to "go one deeper" if the bject is still nested. Potentially also a fault in the flatten Object function?
    // console.log(res)

    // Map to custom groups
    const withGroups: any[] = [];
    Object.entries(res).forEach(setting => {
      if(!this.findGroup(setting[0])){
        setting[1].forEach((subsetting: any) => {
          if(typeof subsetting === 'object'){
            //console.log(subsetting[Object.keys(subsetting)[0]])
            withGroups.push([this.findGroup(Object.keys(subsetting)[0]), Object.keys(subsetting)[0], subsetting[Object.keys(subsetting)[0]]]);
          }
        })
      }
      else {
        if (this.findGroup(setting[0]) === 'NONE') {
          return;
        }
        withGroups.push([this.findGroup(setting[0]), setting[0], setting[1]]);
      }
      
    });

    // console.log(withGroups)

    // Formatting
    const formatSet = Object.values(withGroups).map(setting => {
      setting[1] = setting[1].charAt(0).toUpperCase() + setting[1].replace(/([a-z0-9])([A-Z])/g, '$1 $2').slice(1);
      if (setting[0] === undefined) {
        setting[0] = 'MISCELLANEOUS';
      }
      const formatted: { [index: string]: any } = {};
      formatted[setting[1]] = setting[2];
      // console.log(setting[0], formatted)
      return ([setting[0], formatted]);
    });

    // Grouping
    const resultNew: { [index: string]: any } = {};
    formatSet.forEach(setting => {
      const key = setting[0];
      if (!resultNew[key]) {
        resultNew[key] = Object.assign({}, setting[1]);
      } else {
        Object.assign(resultNew[key], setting[1]);
      }
    });
    return resultNew;
  }


  ////////////////////////////////////////
  // Helper Functions
  ////////////////////////////////////////
  /** Traverse Object until leaf node */
  flattenObject(obj: { [index: string]: any }): object {
    const result: { [index: string]: any } = {};
    for (const i in obj) {
      if (!obj.hasOwnProperty(i)) {
        continue;
      }
      if (obj[i] === null) {
        obj[i] = 'null';
      }
      if ((typeof obj[i]) === 'object') {
        const flatObject: { [index: string]: any } = this.flattenObject(obj[i]);
        for (const x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) {
            continue;
          }
          result[i + '.' + x] = flatObject[x];
        }
      } else {
        result[i] = obj[i];
      }
    }
    return result;
  }

  /**
   * Find group that Setting should be displayed in according to our custom order
   * defined in settingGroups.js
   */
  findGroup(name: string): string | undefined {
    for (const [groupKey, groupVal] of Object.entries(settingGroups)) {
      if (groupVal.hasOwnProperty(name)) {
        return groupKey;
      }
    }
  }

  /** Assign object of the dropdown accordion to make it accessible for manipulation */
  setStreamsDropdownExpandedPanel(panel: MatExpansionPanel): void {
    this.streamsDropdownExpandedPanel = panel;
  }

  /** Toggle visibility of dropdown menu. If it gets hidden, close the accordion */
  streamsDropdownToggle(): void {
    this.streamsDropdownIsVisible = !this.streamsDropdownIsVisible;
    if (!this.streamsDropdownIsVisible) {
      this.streamsDropdownExpandedPanel?.close();
      this.streamsDropdownExpandedPanel = null;
    }
  }

  /** When a stream is selected, get item, apply URL and toggle dropdown menu */
  selectStream(item: object): void {
    this.srcItemSelected = item;
    this.srcItemSelectedJSON = JSON.stringify(item);
    if (item && typeof item === 'object' && hasOwnProperty(item, 'url') && typeof item.url === 'string') {
      this.inputVarStreamAddr = item.url;
    }
    else {
      this.inputVarStreamAddr = '';
    }
    this.streamsDropdownToggle();
  }

  /** When a custom stream url is entered, set selected item to null (To prevent that e.g. wrong protData is set) */
  changeStreamUrl(): void {
    this.srcItemSelected = null;
    this.srcItemSelectedJSON = '';
  }

  /** Load stream url and additional settings if available */
  load(): void {
    this.playerService.setProtectionData(this.protectionData);

    // If a stream item is selected (Not the case if a custom URL was entered)
    if (this.srcItemSelected && typeof this.srcItemSelected === 'object') {

      // If there is pre-defined protection data
      if (hasOwnProperty(this.srcItemSelected, 'protData') && typeof this.srcItemSelected.protData === 'object'
        && this.srcItemSelected.protData !== null) {
        this.drmHandler.handleProtectionData(this.srcItemSelected.protData);
        const protData = this.drmHandler.setDrm();
        console.log(protData);
        this.playerService.setProtectionData(protData);
        //this.playerService.setProtectionData(this.srcItemSelected.protData);
        //@ts-ignore
      } else if(this.drmHandler.protectionData !== {}){
        let protData = this.drmHandler.setDrm();
        this.playerService.setProtectionData(protData);
      }

      // If there is pre-defined buffer config
      if (hasOwnProperty(this.srcItemSelected, 'bufferConfig')
        && typeof this.srcItemSelected.bufferConfig === 'object' && this.srcItemSelected.bufferConfig !== null) {
        const bufferConfig = this.srcItemSelected.bufferConfig;
        const dashjsConfig: any = {};
        dashjsConfig.streaming = {};

        if (hasOwnProperty(bufferConfig, 'liveDelay') && typeof bufferConfig.liveDelay === 'number') {
          dashjsConfig.streaming.liveDelay = bufferConfig.liveDelay;
        }

        if (hasOwnProperty(bufferConfig, 'lowLatencyMode') && typeof bufferConfig.lowLatencyMode === 'boolean') {
          dashjsConfig.streaming.lowLatencyEnabled = bufferConfig.lowLatencyMode;
        }

        if (hasOwnProperty(bufferConfig, 'stableBufferTime')
            && typeof bufferConfig.stableBufferTime === 'number') {
          dashjsConfig.streaming.stableBufferTime = bufferConfig.stableBufferTime;
        }

        if (hasOwnProperty(bufferConfig, 'bufferTimeAtTopQuality')
            && typeof bufferConfig.bufferTimeAtTopQuality === 'number') {
          dashjsConfig.streaming.bufferTimeAtTopQuality = bufferConfig.bufferTimeAtTopQuality;
        }

        if (hasOwnProperty(bufferConfig, 'bufferTimeAtTopQualityLongForm')
            && typeof bufferConfig.bufferTimeAtTopQualityLongForm === 'number') {
          dashjsConfig.streaming.bufferTimeAtTopQualityLongForm = bufferConfig.bufferTimeAtTopQualityLongForm;
        }

        if (Object.entries(dashjsConfig.streaming).length > 0) {
          // Apply settings and refresh this.groups to display changes in settings UI
          this.playerService.player.updateSettings(dashjsConfig);
          this.groups = Object.entries(this.processSettings());
        }
      }
    }

    this.playerService.load(this.inputVarStreamAddr);
  }

  /** Toggle visibility of settings section. */
  settingsSectionToggle(): void {
    this.settingsSectionIsVisible = !this.settingsSectionIsVisible;
  }

  /** Checks for provider and set Badge color */
  getBadgeColor(e: string): string {
    // if(e === ''){
    //   if(this.colorIterator >= this.badgeColorList.length){
    //     this.colorIterator = 0;
    //   }
    //   return this.badgeColorList[this.colorIterator++];
    // } 
    if(e === ''){
      return '#34d8eb';
    } 
    return e;
  }

  setQueryData = (currentQuery:any) => {
    // currentQuery = currentQuery.substring(1).split('@').join('');
    // let passedSettings;
    // [passedSettings, this.protectionData] = this.queryHandler.toSettingsObject(currentQuery);
    var passedSettings = currentQuery.slice(currentQuery.indexOf('@')).substring(1);
        passedSettings = this.queryHandler.toSettingsObject(passedSettings)[0];
        this.protectionData = this.queryHandler.toSettingsObject(currentQuery.split('@').join(''))[1];
    //TODO: Reflect DRM-changes in UI!
    console.log(passedSettings);
    this.playerService.player.updateSettings(passedSettings);
    this.drmHandler.handleProtectionData(this.protectionData);
    this.playerService.setProtectionData(this.protectionData);
  }
}

