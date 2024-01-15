import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {interval, Subscription} from 'rxjs';
import {
  ChartComponent,
  ApexChart,
  ApexTheme,
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexMarkers,
  ApexLegend
} from 'ng-apexcharts';
import { PlayerService } from '../../services/player.service';
import { MetricsService } from '../../services/metrics.service';
import { METRICOPTIONS } from '../../../assets/metrics';
import { Metrics } from '../../types/metric-types';
import { hasOwnProperty } from '../../../assets/hasownproperty';

declare var dashjs: any;

export type ChartOptions = {
  chart: ApexChart;
  theme: ApexTheme;
  series: ApexAxisChartSeries;
  title: ApexTitleSubtitle;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  markers: ApexMarkers;
  legend: ApexLegend;
};


@Component({
  selector: 'app-metrics-view',
  templateUrl: './metrics-view.component.html',
  styleUrls: ['./metrics-view.component.css']
})
export class MetricsViewComponent implements OnInit, OnDestroy {
  chartActive = false;
  mouseOnChart = false;

  // What metric options are selected and what available
  private selectedOptionKeys: Array<string> = [];

  // Get a reference of the chart object
  @ViewChild('chartObj') chart!: ChartComponent;

  private chartYAxesJson = '';
  private chartData: { [index: string]: Array<[number, number]> } = {};
  private emptySeries: ApexAxisChartSeries = [{
    name: '',
    data: [[0, 0]],
  }];

  // Set chart options
  private refreshInterval = 1000;
  private yAxisMock: ApexYAxis = {
    title: {
      text: '',
      style: {
        fontWeight: '500',
        fontSize: '11px',
      },
    },
    axisBorder: { show: false },
    labels: {
      formatter: (val) => {
        if(Number.isInteger(val)){
          return val.toString();
        } 
        else{
          return val.toPrecision(4);
        } 
      },
      style: {
        fontWeight: 'normal',
        fontSize: '12px',
      },
    }
  };
  public chartOptions: ChartOptions = {
    chart: {
      height: '270px',
      type: 'line',
      toolbar: {
        show: true,
        tools: {
          download: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        dynamicAnimation: {
          speed: this.refreshInterval * 0.8
        }
      },
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji","Segoe UI Emoji", "Segoe UI Symbol"',
      foreColor: 'var(--color-font-main)'
    },
    theme: {
      mode: 'light',
      palette: 'palette6',
    },
    series: this.emptySeries,
    title: {
      text: 'Stream Metrics Live Chart',
      style: {
        // Note that the following should match global h1 styling
        fontWeight: '500',
        fontSize: '16px',
        color: 'var(--color-font-dark)'
      },
    },
    xaxis: {
      type: 'numeric',
      range: 10,
      title: {
        text: 't / Seconds',
        style: {
          fontWeight: '500',
          fontSize: '12px',
        },
      }
    },
    yaxis: this.yAxisMock,
    stroke: {
      curve: 'smooth',
    },
    markers: {
      // Markers are buggy on livecharts
      size: 0,
    },
    legend: {
      show: true,
      showForSingleSeries: true,
      showForNullSeries: false,
      showForZeroSeries: true,
      position: 'top',
      onItemClick: {
        toggleDataSeries: false
      },
      onItemHover: {
        highlightDataSeries: true
      },
    }
  };

  private subscription!: Subscription;
  private sessionStart = NaN;

  constructor(private playerService: PlayerService,
              private metricsService: MetricsService) {
    // Subscribe to the service observable to receive metrics selection
    this.metricsService.updateMetricsSelectionCalled$.subscribe(
      selectedOptionKeys => {
        this.selectedOptionKeys = selectedOptionKeys;
        this.metricsSelectionChanged();
      });

  }

  ngOnInit(): void {
    // Setup an rxjs interval and subscribe updater method
    const source = interval(this.refreshInterval);
    this.subscription = source.subscribe(() => this.intervalMain());

    // Setup listener for stream initialization. That event triggers a full chart reset
    this.playerService.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      this.reset();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Main interval method, called every x seconds and handles data and chart refresh, deletion, etc. */
  intervalMain(): void {
    // If player is initialized and source is applied, update all available metric data
    if (this.playerService.player.isReady()) {

      if (isNaN(this.sessionStart)) {
        this.sessionStart = new Date().getTime() / 1000;
      }

      this.updateChartData();

      // If user has selected some metric to display, set active and update chart
      if (Array.isArray(this.selectedOptionKeys) && this.selectedOptionKeys.length) {
        this.chartActive = true;
        this.updateChart();
      }
      else {
        this.chartActive = false;
      }

      /*
       * Get rid of old data every 30 minutes. This should not be done too often since it
       * destroys the horizontal realtime animation.
       */
      if (this.getDataTime() % 3600 === 0) {

        const keys = Object.keys(this.chartData);
        const slice = (this.chartOptions.xaxis.range) ? ((this.chartOptions.xaxis.range + 1) * -1) : -1;

        for (const key of keys) {
          this.chartData[key] = this.chartData[key].slice(slice);
        }
      }
    }
    // If player is not ready (anymore) but there is chart data left, reset
    else if (Object.keys(this.chartData).length) {
      this.reset();
    }
  }

  /** Get fresh metrics dataset and push it into chartData */
  updateChartData(): void {
    const metrics: Metrics = this.playerService.getMetrics(true);

    // Iterate through all available metrics and push their data into this.chartData
    for (const [metricObjKey, metricObjVal] of Object.entries(metrics)) {

      for (const [typeObjKey, typeObjVal] of Object.entries(metricObjVal)) {

        let metricValue = NaN;

        // Handle plain numbers
        if (typeof typeObjVal === 'number') {
          metricValue = typeObjVal;
        }
        // Handle objects with current vs. max value (We show current on chart and max on overlay)
        else if (typeObjVal && typeof typeObjVal === 'object'
          && hasOwnProperty(typeObjVal, 'current')
          && hasOwnProperty(typeObjVal, 'max')
          && typeof typeObjVal.current === 'number') {

          metricValue = typeObjVal.current;
        }
        // Handle objects with min / avg / max values (We show avg on chart, min and max on overlay)
        else if (typeObjVal && typeof typeObjVal === 'object'
          && hasOwnProperty(typeObjVal, 'min')
          && hasOwnProperty(typeObjVal, 'avg')
          && hasOwnProperty(typeObjVal, 'max')
          && typeof typeObjVal.avg === 'number') {

          metricValue = typeObjVal.avg;
        }

        // Apexcharts actually supports null values but is buggy. Use -1 instead
        metricValue = isNaN(metricValue) ? -1 : metricValue;
        const fullKey = `${metricObjKey}.${typeObjKey}`;

        if (!this.chartData[fullKey]) {
          this.chartData[fullKey] = new Array<[number, number]>();
        }

        this.chartData[fullKey].push([this.getDataTime(), metricValue]);
      }
    }
  }

  /** Append selected series data to chart */
  updateChart(): void {
    // We want the chart to stop if mouse is on it, otherwise user interactions would not work.
    if (this.mouseOnChart) {
      return;
    }

    const chartSeriesNew: ApexAxisChartSeries = [];
    const chartYAxesNew: Array<ApexYAxis> = [];

    // Iterate through all selected options and create a series and y-axis for each
    for (const fullKey of this.selectedOptionKeys) {

      if (this.chartData[fullKey]) {

        const key = fullKey.split('.');
        const metricInfo = METRICOPTIONS.find(element => element.key === key[0]);

        if (!metricInfo) {
          continue;
        }

        const typeString = key[1].charAt(0).toUpperCase() + key[1].slice(1);
        const chartInfo = metricInfo.chartInfo ? ` ${metricInfo.chartInfo}` : '';
        const fullName = `${metricInfo.name} ${typeString} ${chartInfo}`;

        const yaxis: ApexYAxis = {
          seriesName: fullName,
          title: Object.assign({...this.yAxisMock.title}, { text: fullName }),
          opposite: false,
          axisBorder: { show: false }
        };

        if (chartYAxesNew.length > 0) {
          yaxis.opposite = true;
          yaxis.axisBorder = { show: true };
        }

        chartSeriesNew.push({
          name: fullName,
          data: this.chartData[fullKey],
        });

        // Note that we assign to a copy of this.yAxisMock so that this.yAxisMock itself is not changed
        chartYAxesNew.push( Object.assign({...this.yAxisMock}, yaxis) );
      }
    }

    // Update series only if y axes have not changed, otherwise update whole chart
    const chartYAxesNewJson = JSON.stringify(chartYAxesNew);
    if (this.chartYAxesJson === chartYAxesNewJson) {
      this.chart.updateSeries(chartSeriesNew);
    }
    else {
      this.chartYAxesJson = chartYAxesNewJson;
      this.chart.updateOptions({
        series: chartSeriesNew,
        yaxis: chartYAxesNew
      });
    }
  }

  /** Called on changed metrics selection. Perhaps the chart has to be cleaned */
  metricsSelectionChanged(): void {
    if (Array.isArray(this.selectedOptionKeys) && !this.selectedOptionKeys.length) {

      this.chart.updateOptions({
        series: this.emptySeries,
        yaxis: this.yAxisMock
      });
    }
  }

  /** Reset: Clear chart and data. */
  reset(): void {
    this.chartActive = false;
    this.sessionStart = NaN;
    this.chartData = {};
    this.chartYAxesJson = '';
    this.chart.updateOptions({
      series: this.emptySeries,
      yaxis: this.yAxisMock
    });
  }

  /** Return time in seconds since session start */
  getDataTime(): number {
    const now = new Date().getTime() / 1000;
    return Math.max(now - this.sessionStart, 0);
  }
}
