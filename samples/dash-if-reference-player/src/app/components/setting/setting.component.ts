import {
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSlider } from '@angular/material/slider';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { NgxMasonryComponent } from 'ngx-masonry';
import { PlayerService } from '../../services/player.service';
import { QueryHandlerService } from '../../services/query-handler.service';
import { DrmHandlerService } from '../../services/drm-handler.service';
import { constants } from 'src/assets/constants';

declare var dashjs: any;

interface AverageCalculationMode {
  value: string,
  viewValue: string
}

interface LiveCatchupMode {
  value: string,
  viewValue: string
}

interface LowLatencyDownloadTimeCalculationMode {
  value: string,
  viewValue: string
}

interface SelectionModeForInitialTrack {
  value: string,
  viewValue: string
}

interface TrackSwitchMode {
  value: string,
  viewValue: string
}

@Component({
  selector: 'app-drm-dialog',
  templateUrl: './drm-dialog.html',
  styleUrls: ['./drm-dialog.css'],
})

export class DrmDialogComponent {
  isValidJSON = true;

  constructor(@Inject(MAT_DIALOG_DATA) public data: string) {}

  checkSyntax(): void {
    this.isValidJSON = true;
    try {
      JSON.parse(this.data);
    } catch (e) {
      this.isValidJSON = false;
    }
  }
}


@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.css'],
  encapsulation: ViewEncapsulation.None,
})

export class SettingComponent implements OnInit {
  @ViewChild(NgxMasonryComponent) masonry!: NgxMasonryComponent;
  // Intercept input property change
  @Input() set groups(groups: Array<any>) { this.setGroups(groups); }
  // tslint:disable-next-line:variable-name
  _groups: Array<any> = [];
  @Input() settingGroup: object = [];

  radioValues = constants;
  loopSelected = true;
  autoPlaySelected = true;
  autoLoadSelected = true;
  muted = false;
  drmSelected = false;
  oldDrmSelected = false;
  prioritiesEnabled = false;

  selectedAverageCalculationMode: string = 'throughputCalculationModeEwma';
  averageCalculationModes: AverageCalculationMode[] = [
    {value: 'throughputCalculationModeEwma', viewValue: 'EWMA'},
    {value: 'throughputCalculationModeZlema', viewValue: 'ZLEMA'},
    {value: 'throughputCalculationModeArithmeticMean', viewValue: 'Arithmetic Mean'},
    {value: 'throughputCalculationModeByteSizeWeightedArithmeticMean', viewValue: 'Byte Size Weighted Arithemtic Mean'},
    {value: 'throughputCalculationModeDateWeightedArithmeticMean', viewValue: 'Date Weighted Arithmetic Mean'},
    {value: 'throughputCalculationModeHarmonicMean', viewValue: 'Harmonic Mean'},
    {value: 'throughputCalculationModeByteSizeWeightedHarmonicMean', viewValue: 'Byte Size Weighted Harmonic Mean'},
    {value: 'throughputCalculationModeDateWeightedHarmonicMean', viewValue: 'Date Weighted Harmonic Mean'}
  ];

  selectedLiveCatchupMode: string = 'liveCatchupModeDefault';
  liveCatchupModes: LiveCatchupMode[] = [
    {value: 'liveCatchupModeDefault', viewValue: 'Default'},
    {value: 'liveCatchupModeLoLP', viewValue: 'LoLP'}
  ]

  selectedLowLatencyDownloadTimeCalculationMode: string = 'lowLatencyDownloadTimeCalculationModeMoofParsing';
  lowLatencyDownloadTimeCalculationModes: LowLatencyDownloadTimeCalculationMode[] = [
    {value: 'lowLatencyDownloadTimeCalculationModeMoofParsing', viewValue: 'Moof Parsing'},
    {value: 'lowLatencyDownloadTimeCalculationModeDownloadedData', viewValue: 'Downlaoded Data'},
    {value: 'lowLatencyDownloadTimeCalculationModeAast', viewValue: 'AAST'}
  ]

  selectedModeForInitialTrack: string = 'highestSelectionPriority';
  selectionModeForInitialTracks: SelectionModeForInitialTrack[] = [
    {value: 'highestSelectionPriority', viewValue: 'Highest Selection Priority'},
    {value: 'firstTrack', viewValue: 'First Track'},
    {value: 'highestBitrate', viewValue: 'Highest Bitrate'},
    {value: 'highestEfficiency', viewValue: 'Highest Efficiency'},
    {value: 'widestRange', viewValue: 'Widest Range'}
  ]

  selectedTrackSwitchModeAudio: string = 'alwaysReplace';
  trackSwitchModesAudio: TrackSwitchMode[] = [
    {value: 'alwaysReplace', viewValue: 'Always Replace'},
    {value: 'neverReplace', viewValue: 'Never Replace'}
  ]

  selectedTrackSwitchModeVideo: string = 'neverReplace';
  trackSwitchModesVideo: TrackSwitchMode[] = [
    {value: 'alwaysReplace', viewValue: 'Always Replace'},
    {value: 'neverReplace', viewValue: 'Never Replace'}
  ]

  dropDownSettingsList : String[] = ['Average Calculation Mode', 'video', 'audio', 'mode'];

  ngRadioBoxes: { [index: string]: string } = {};

  defaultExternalSettings = {
    mpd: encodeURIComponent('https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd'),
    loop: true,
    autoPlay: true,
    autoLoad: false,
    muted: false,
    drmSelected: false,
    // forceQualitySwitchSelected: false,
    drmPrioritiesEnabled: false,
    // languageAudio: null,
    // roleVideo: null,
    // languageText: null,
    // roleText: undefined,
    // forceTextStreaming: false
}

  constructor(public playerService: PlayerService, public dialog: MatDialog, public changeDetector: ChangeDetectorRef,
              public queryHandler: QueryHandlerService, public drmHandler: DrmHandlerService) {
    this.playerService.updateProtectionDataCalled$.subscribe(
      protectionData => {
        this.oldDrmSelected = (Object.entries(protectionData).length > 0);
      });
  }

  ngOnInit(): void {
    // Restructure radio button data to use [(ngModel)] in template
    for (const [radioGroupKey, radioGroupValue] of Object.entries(constants)) {
      for (const [radioOptionKey, radioOptionValue] of Object.entries(radioGroupValue)) {
        if (this.isGroup(radioOptionValue)) {
          // If entry is a group itself, loop over entries and apply if an entries value is true
          for (const [radioSubKey, radioSubValue] of Object.entries(radioOptionValue)) {
            if (radioSubValue === true) {
              const key = `${radioGroupKey}.${radioOptionKey}`;
              this.ngRadioBoxes[key] = radioSubKey;
            }
          }
        }
        else if (radioOptionValue === true) {
          // If entry is no group and true, apply it as selected
          this.ngRadioBoxes[radioGroupKey] = radioOptionKey;
        }
      }
    }

    // LOOP
    this.playerService.player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, (e: any) => {
      if (this.loopSelected) {
        this.playerService.load();
      }
    });

    // Grab the query string and pass it to the handling function
    let currentQuery = window.location.search;
    if(currentQuery !== ''){
      currentQuery = currentQuery.substring(1);
      this.queryHandler.checkQueryLength(window.location.href);
      this.setExternalSettings(currentQuery);
    }

    //this.setInitialDrmState();

    this.ngRadioBoxes['logLevel']  = this.getInitialLoglevel() as string;

    this.drmHandler.popUpListener();
  }

  // Apply settings grabbed from the query-string. Handled separately to try and catch and reflect changes, does not work currently
  setExternalSettings = (currentQuery:any) => {
    //currentQuery = currentQuery.substring(1);
    let handleExternalSettings = currentQuery.split('@').join('').split('&');
    for(let index = 0; index < handleExternalSettings.length; index++){
      let [key, value] = handleExternalSettings[index].split('=') || '';
      switch (key){
        case 'loop':
          this.loopSelected = this.parseBoolean(value);
          break;
        case 'autoPlay':
          this.autoPlaySelected = this.parseBoolean(value);
          this.applyAutoPlay();
          break;
        case 'drmSelected':
          this.drmSelected = this.parseBoolean(value);
          break;
        case 'drmPrioritiesEnabled':
          this.prioritiesEnabled = this.parseBoolean(value);
          break;
      }
    }
    this.changeDetector.detectChanges();
  }

  setInitialDrmState = () => {
    let activeDrms = this.queryHandler.getActiveDrms();
    for (let drm in activeDrms){
      switch (drm){
        case 'playready':
          this.drmHandler.drmPlayready = activeDrms[drm];
          break;
        case 'widevine':
          this.drmHandler.drmWidevine = activeDrms[drm];
          break;
        case 'clearkey':
          this.drmHandler.drmClearkey = activeDrms[drm];
          break;
      }
    }
  }

  getInitialLoglevel = () => {
    let currentLogLevel = this.playerService.player.getSettings().debug.logLevel;
    let radioLogLevel;
    switch(currentLogLevel){
      case 0:
        radioLogLevel = 'NONE';
        break;
      case 1:
        radioLogLevel = 'FATAL';
        break;
      case 2: 
        radioLogLevel = 'ERROR';
        break;
      case 3:
        radioLogLevel = 'WARNING';
        break;
      case 4:
        radioLogLevel = 'INFO';
        break;   
      case 5:
        radioLogLevel = 'DEBUG';
        break;
    }
    return radioLogLevel;
  }

  parseBoolean(value: string | boolean): boolean{
    return value === true || value === 'true';
  }

  /** Handle incoming groups/settings */
  setGroups(groups: Array<any>): void {
    // Add hard-coded group DRM SYSTEM
    groups.push(['DRM SYSTEM', {}]);
    // Push the "Unassigned" group to the end as it will cause the following groups to not render
    //groups.push(groups.splice(groups.indexOf('UNASSIGNED'), 1)[0]);
    for(let i = 0; i < groups.length; i++){
      if(groups[i][0] === 'UNASSIGNED'){
        groups.push(groups.splice(i, 1)[0]);
      }
    }
    console.log(groups);

    if (this._groups.length < 1) {
      this._groups = groups;
    }
    else {
      const sizeOfGroups = Object.entries(groups).length;

      // Loop over new settings and apply changed entries (To avoid ugly re-rendering of the component)
      for (let i = 0; i < sizeOfGroups; i++) {
        if (JSON.stringify(this._groups[i]) !== JSON.stringify(groups[i])) {
          for (const groupKey of Object.keys(groups[i][1])) {
            if (JSON.stringify(this._groups[i][1][groupKey]) !== JSON.stringify(groups[i][1][groupKey])) {
              this._groups[i][1][groupKey] = groups[i][1][groupKey];
            }
          }
        }
      }
    }
  }

  /** Check for grouped Settings */
  isGroup(val: any): boolean {
    if (val == null || typeof val === 'string') {
      return false;
    } else {
      return (Object.values(val).length > 0);
    }
  }

  /** Check if value is of type boolean */
  isBool(value: any): boolean {
    return (typeof value === 'boolean');
  }

  /** Check if value is of type number */
  isNumber(value: any): boolean {
    return (typeof value === 'number');
  }

  // /** Check if value is Average Calculation Mode  **/
  // isAverageCalculationMode(value: any): boolean {
  //   // this.dropDownSettingsList.forEach(item => {
  //   //   if(value === item) return true;
  //   // })
  //   // return false;
  //   return value === 'Average Calculation Mode';
  // }

  // /** Check if value is part of the list of dropdown settings  **/
  // isLiveCatchup(value: any): boolean {
  //   return value === 'Live Catchup';
  // }

  // /** Check if value is part of the list of dropdown settings  **/
  // isLowLatencyDownloadTimeCalculationMode(value: any): boolean {
  //   return value === 'Low Latency Download Time Calculation Mode';
  // }
  

  /** Potential alternative **/
  isDropdown(value: any, setting: string, secondValue?:string, sursetting?: string){
    //console.log(this.dropDownSettingsList.includes(value));
    if(secondValue && sursetting){
      return (value === setting && secondValue === sursetting);
    }
    return value === setting;
  }

  /** Check if setting value is a number or a string */
  isInput(value: any): boolean {
    return (!this.isBool(value) && !this.isGroup(value) && !this.isRadio(value));
  }

  /** Check if value has constants as value */
  isRadio(value: any): boolean {
    return Object.keys(this.radioValues).includes(value);
  }

  /** Check if value is log level */
  isLogLevel(value: any): boolean {
    return value === 'Log Level';
  }

  /** Compare radio-constants key with setting key */
  compareRadioKey(constant: any, setting: any): boolean {
    if (typeof constant === 'string' && typeof setting === 'string') {
      const formatted = setting[0].toLowerCase() + setting.replace(/\s/g, '').slice(1);
      return formatted === constant;
    }
    return false;
  }

  /** If drm has been turned off, remove protection data and do a reload. */
  drmToggle(element: MatSlideToggle): void {
    if (!element.checked) {
      console.log(element.checked, this.drmSelected);
      this.playerService.setProtectionData({});
      this.playerService.load();
    }
    else{
      console.log(element.checked, this.drmSelected);
    }
  }

  /** Apply changed auto-play */
  applyAutoPlay(): void {
    this.playerService.player.setAutoPlay(this.autoPlaySelected);
  }

  /** Add custom ABR Rules if Default Rules are enabled */
  toggleDefaultABRRules(checked: string | boolean | number): void {
    if ( !checked ) {
      // Add custom ABR Rule here
      // this.playerService.player.addABRCustomRule();
    } else {
      this.playerService.player.removeAllABRCustomRule();
    }
  }

  /** Update Settings: call dash.js updateSettings function with the path of the setting */
  update(path: string, value: string | boolean | number): void {
    console.log(path, value)
    // If abrLoLP was selected, change additional options and also apply them to the template
    if (value === 'abrLoLP') {
      this.update('streaming.abr.fetchThroughputCalculationMode', 'abrFetchThroughputCalculationMoofParsing');
      this.update('streaming.liveCatchup.mode', 'liveCatchupModeLoLP');
      this.ngRadioBoxes['fetchThroughputCalculationMode' as const] = 'abrFetchThroughputCalculationMoofParsing';
      this.ngRadioBoxes['liveCatchup.mode' as const] = 'liveCatchupModeLoLP';
    }

    // Build Object from path to pass to updateSettings function
    const parts = path.split('.');
    const name = parts.pop()?.toString() ?? undefined;

    if (name === undefined) {
      return;
    }
    const root: { [index: string]: string | boolean | number } = {};
    if (typeof value === 'string') { value = this.queryHandler.typeCastFromString(value); }
    root[name] = value;

    const settingObject = parts.reduceRight((obj: any, next: any) => ({
      [next]: obj
    }), root) as dashjs.MediaPlayerSettingClass;
    this.playerService.player.updateSettings(settingObject);

    // Check if customABRRules were toggled
    if (Object.keys(root).toString() === 'useDefaultABRRules') {
      this.toggleDefaultABRRules(root.useDefaultABRRules);
    }
  }

  logThis(value: any): void {
    console.log(value);
  }

  /** Update Log Level: switch from string to enum value */
  updateLogLevel(value: string): void {
    let level;
    switch (value) {
      case 'NONE':
        level = dashjs.Debug.LOG_LEVEL_NONE;
        break;
      case 'FATAL':
        level = dashjs.Debug.LOG_LEVEL_FATAL;
        break;
      case 'ERROR':
        level = dashjs.Debug.LOG_LEVEL_ERROR;
        break;
      case 'WARNING':
        level = dashjs.Debug.LOG_LEVEL_WARNING;
        break;
      case 'INFO':
        level = dashjs.Debug.LOG_LEVEL_INFO;
        break;
      case 'DEBUG':
        level = dashjs.Debug.LOG_LEVEL_DEBUG;
        break;
      default:
        level = dashjs.Debug.LOG_LEVEL_WARNING;
    }
    console.log(level);
    this.playerService.player.updateSettings({
      debug: {logLevel: level}
    });
  }

  /** Update initial media settings */
  updateMediaSettings(type: string, input: HTMLInputElement): void {
    if (type === 'audio') {
      this.playerService.player.setInitialMediaSettingsFor('audio', {
        lang: input.value
      });
    }
    if (type === 'video') {
      this.playerService.player.setInitialMediaSettingsFor('video', {
        role: input.value
      });
    }
    if (type === 'lang') {
      this.playerService.player.setInitialMediaSettingsFor('fragmentedText', {
        lang: input.value
      });
    }
    if (type === 'role') {
      this.playerService.player.setInitialMediaSettingsFor('fragmentedText', {
        role: input.value
      });
    }
  }

  /** Set Video Quality */
  selectVideoQuality(slider: MatSlider): void {
    if (slider.value) {
      this.playerService.player.setQualityFor('video', slider.value);
    }
  }

  /** Get Api description from SettingGroup */
  getApiDescription(groupName: string, setting: any): string {
    if (typeof setting !== 'string') {
      return '';
    }
    let description: object = {};
    let tooltip = '';
    Object.entries(this.settingGroup).map(([key, value]) => {
      if (key === groupName) {
        description = value;
      }
    });
    Object.entries(description).map(([key, value]) => {
      key = key.charAt(0).toUpperCase() + key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').slice(1);
      if (key === setting) {
        tooltip = value;
      }
    });
    return tooltip;
  }

  /** Keep original order */
  keepOrder = (a: any, b: any) => {
    return a;
  }

  /** Format string of radio button option */
  formatRadioOption(value: any): string {
    if (typeof value !== 'string') {
      return '';
    }
    const length = value.split(/(?=[A-Z])/).length;
    // Only format long values that do not fit
    if (length > 4) {
      return value.split(/(?=[A-Z])/)[length - 2] + value.split(/(?=[A-Z])/)[length - 1];
    } else {
      return value;
    }
  }

  /** Trigger re-arrangement of masonry items */
  updateMasonry(): void {
    this.masonry.layout();
  }

  /** Allow button to access the service-function */
  copyQueryUrl(){
    let currentExternalSettings = {
      //@ts-ignore
      mpd: encodeURIComponent(decodeURIComponent(document.getElementById('inputNameStreamAddr').value)),
      loop: this.loopSelected,
      autoPlay: this.autoPlaySelected,
      autoLoad: this.autoLoadSelected,
      drmSelected: this.drmSelected,
      drmPrioritiesEnabled: this.prioritiesEnabled,
    }

    let externalSettingsString = this.queryHandler.toQueryString(this.queryHandler.makeSettingDifferencesObject(currentExternalSettings, this.defaultExternalSettings));
    externalSettingsString = externalSettingsString + '&';
    // let externalSettingsString = 'loop=' + this.loopSelected
    //                            + '&autoPlay=' + this.autoPlaySelected
    //                            + '&drmSelected=' + this.drmSelected
    //                            + '&drmPrioritiesEnabled=' + this.prioritiesEnabled
    //                            + '&';
    if(this.drmSelected){
      this.drmHandler.handleRequestHeader();
      this.drmHandler.handleClearkeys();
      let drmList = [this.drmHandler.drmPlayready, this.drmHandler.drmWidevine, this.drmHandler.drmClearkey];
      let currentDrm;
      for(let drm of drmList){
        if(drm.isActive){
          switch(true){
            case drm.drmKeySystem.includes('playready'):
              currentDrm = {'playready': drm};
              externalSettingsString += this.queryHandler.toQueryString(currentDrm) + '&';
              break;
            case drm.drmKeySystem.includes('widevine'):
              currentDrm = {'widevine': drm};
              externalSettingsString += this.queryHandler.toQueryString(currentDrm) + '&';
              break;
            case drm.drmKeySystem.includes('clearkey'):
              currentDrm = {'clearkey': drm};
              externalSettingsString += this.queryHandler.toQueryString(currentDrm) + '&';
              break;
          }
        }
      }
    }
    this.queryHandler.copyQueryUrl(externalSettingsString);
  }

  deriveNameStringFromCamelCase = (value: string) => {
    value = value.charAt(0).toUpperCase() + value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').slice(1);
    return value;
  }
}



