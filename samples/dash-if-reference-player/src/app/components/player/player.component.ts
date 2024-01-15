import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements AfterViewInit {

  // Get <video> element reference
  @ViewChild('videoPlayer', {read: ElementRef}) videoElement!: ElementRef<HTMLElement>;

  // Get <div> element reference for TTML rendering
  @ViewChild('ttmlRenderingDiv', {read: ElementRef}) TTMLRenderingDiv!: ElementRef<HTMLDivElement>;

  constructor(private playerService: PlayerService) { }

  ngAfterViewInit(): void {
    // When <video> element ref is available, initialize dashjs player via playerService
    this.playerService.initialize(this.videoElement.nativeElement);

    // Enable TTML Captions
    this.playerService.player.attachTTMLRenderingDiv(this.TTMLRenderingDiv.nativeElement);

    let divObject = document.getElementById('videoPlayer');
    let volumebar: any = document.getElementById('volumebar');
    let timeToSkip;

    let isDoubleClick = false;
    let clickTimeout: any;
    let doubleclickTimeout: any;

    let videoSelected = false;

    divObject?.addEventListener('click', event => {

      clearTimeout(clickTimeout);
      setTimeout(() => {
        if (divObject instanceof HTMLVideoElement && !isDoubleClick){
          if (divObject.paused){
            divObject.play();
          }
          else{
            divObject.pause();
          }
        }
      }, 500);
    });

    divObject?.addEventListener('dblclick', event => {
      isDoubleClick = true;
      clearTimeout(doubleclickTimeout);
      doubleclickTimeout = setTimeout(() => {
        isDoubleClick = false;
      }, 500);
      this.playerService.toggleFullscreen();
    });

    /** Check if the video or video controls are focussed */
    document.addEventListener('click', event => {
      // variables to prevent Typescript "no such property" errors
      let thisElement = <HTMLElement> event.target;
      let parentElement = <HTMLElement> thisElement.parentNode;
      let grandparentElement = <HTMLElement> parentElement.parentNode;

      if (thisElement !== null){
        if (thisElement.id === 'videoPlayer' ||
           thisElement.id === 'videoController' ||
           thisElement.id === 'playerContainer' ||
           parentElement.id === 'videoController' ||
           grandparentElement.id === 'videoController')
        {
          videoSelected = true;
        }
        else{
          videoSelected = false;
        }
      }
    });

    /** Keypress functionality for Player-Controls */
    document.addEventListener('keyup', event => {
      let capturedKey;
      let currentVolume = parseFloat(volumebar.value);

      // If the video is not focussed, do not go into controls
      if (!videoSelected) { return; }

      // Handle Cross-Browser-Support
      if (event.key !== undefined) {
        capturedKey = event.key;
      // @ts-ignore
      } else if (event.keyIdentifier !== undefined) {
        // @ts-ignore
        capturedKey = event.keyIdentifier;
      // tslint:disable-next-line: deprecation
      } else if (event.keyCode !== undefined) {
        // tslint:disable-next-line: deprecation
        capturedKey = event.keyCode;
      }

      // Keypress logic
      switch (capturedKey){
        case 'm':
        case 77:
          this.playerService.muteVideo();
          break;
        case 'f':
        case 70:
          this.playerService.toggleFullscreen();
          break;
        case ' ':
        case 32:
          if (this.playerService.player.isPaused()){
            this.playerService.player.play();
          }
          else{
            this.playerService.player.pause();
          }
          break;
        case 'ArrowUp':
        case 38:
          if (currentVolume === 0.0){
            this.playerService.player.setMute(false);
            this.playerService.toggleMuteBtnState();
          }
          (currentVolume > 0.9) ? volumebar.value = 1.0 : volumebar.value = currentVolume + 0.1;
          this.playerService.player.setVolume(parseFloat(volumebar.value));
          event.preventDefault();
          break;
        case 'ArrowDown':
        case 40:
          (currentVolume < 0.1) ? volumebar.volume = 0.0 : volumebar.value = currentVolume - 0.1;
          if (parseFloat(volumebar.value) === 0.0){
            this.playerService.player.setMute(true);
            this.playerService.toggleMuteBtnState();
          }
          this.playerService.player.setVolume(parseFloat(volumebar.value));
          event.preventDefault();
          break;
        case 'ArrowLeft':
        case 37:
          timeToSkip = this.playerService.player.time() - 5;
          this.playerService.player.seek(timeToSkip);
          break;
        case 'ArrowRight':
        case 39:
          timeToSkip = this.playerService.player.time() + 5;
          this.playerService.player.seek(timeToSkip);
          break;

        default:
      }
    });

    /** Prevent default Arrow- and Spacekey functionality */
    window.addEventListener('keydown', (event) => {
      let capturedKey;

      // If the video is not selected, do not prevent default
      if (!videoSelected) { return; }

      // Handle Cross-Browser-Support
      if (event.key !== undefined) {
        capturedKey = event.key;
      // @ts-ignore
      } else if (event.keyIdentifier !== undefined) {
        // @ts-ignore
        capturedKey = event.keyIdentifier;
      // tslint:disable-next-line: deprecation
      } else if (event.keyCode !== undefined) {
        // tslint:disable-next-line: deprecation
        capturedKey = event.keyCode;
      }

      switch (capturedKey){
        case 'ArrowUp':
        case 38:
        case 'ArrowDown':
        case 40:
        case 'ArrowLeft':
        case 37:
        case 'ArrowRight':
        case 39:
        case ' ':
        case 32:
          event.preventDefault();
          break;
      }
    });
  }
}
