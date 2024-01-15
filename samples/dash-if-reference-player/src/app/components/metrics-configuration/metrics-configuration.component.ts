import {Component, OnDestroy, OnInit} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlayerService } from '../../services/player.service';
import { MetricsService } from '../../services/metrics.service';
import { METRICOPTIONS } from '../../../assets/metrics';
import { MetricOption, Metrics } from '../../types/metric-types';


@Component({
  selector: 'app-metrics-configuration',
  templateUrl: './metrics-configuration.component.html',
  styleUrls: ['./metrics-configuration.component.css']
})
export class MetricsConfigurationComponent implements OnInit, OnDestroy {
  // What metrics can be selected to be displayed
  options: MetricOption[] = METRICOPTIONS;
  metrics: Metrics = {};

  // What options are selected
  private selectedOptionKeys: Array<string> = [];
  // Max allowed number of selected options
  private maxNumOfSelectedOptions = 5;
  private messageTooManySelections = `Please select a maximum of ${this.maxNumOfSelectedOptions} metrics only.`;
  private refreshInterval = 1000;
  private subscription!: Subscription;


  constructor( private snackBar: MatSnackBar,
               private playerService: PlayerService,
               private metricsService: MetricsService ) {}

  ngOnInit(): void {
    // Setup an rxjs interval and subscribe update method
    const source = interval(this.refreshInterval);
    this.subscription = source.subscribe(() => this.updateMetrics());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** If player is ready, fetch current metrics from player service */
  updateMetrics(): void {
    if (this.playerService.player.isReady()) {
      this.metrics = this.playerService.getMetrics();
    }
    else {
      this.metrics = {};
    }
  }

  /** Handle checkbox checked change */
  optionChange(checkbox: MatCheckbox, key: string,
               typeKey: 'audio' | 'video' | 'stream'): void {
    const fullKey = `${key}.${typeKey}`;

    if (checkbox.checked) {
      // Option was selected. If more is allowed, push its key into the selectedOptions array and send to service
      if (this.selectedOptionKeys.length < this.maxNumOfSelectedOptions ) {
        this.selectedOptionKeys.push(fullKey);
        this.metricsService.updateMetricsSelection(this.selectedOptionKeys);
      }
      else {
        // That is too many. Unselect element and show a snack-bar note.
        checkbox.checked = false;
        this.snackBar.open(this.messageTooManySelections, '', { duration: 3000 });
      }
    }
    else {
      // Option was un-selected. Search and remove its key from the selectedOptions array and send to service
      const idx = this.selectedOptionKeys.indexOf(fullKey);

      if (idx > -1) {
        this.selectedOptionKeys.splice(idx, 1);
        this.metricsService.updateMetricsSelection(this.selectedOptionKeys);
      }
    }
  }

  ////////////////////////////////////////
  // Template Helpers
  ////////////////////////////////////////
  /** Returns true, if x is of type number. False otherwise. */
  _isNumber(x: any): boolean {
    // console.log('NUM');
    return typeof x === 'number';
  }

  /** Returns true, if x is NaN. False otherwise. */
  _isNaN(x: number): boolean {
    return isNaN(x);
  }
}
