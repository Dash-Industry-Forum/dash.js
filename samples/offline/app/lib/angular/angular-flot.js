/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Develer S.r.L.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* global $ */
/* global angular */
/* global jQuery */

angular.module('angular-flot', []).directive('flot', ['$timeout', function ($timeout) {
  return {
    restrict: 'EA',
    template: '<div></div>',
    scope: {
      dataset: '=',
      options: '=',
      callback: '=',
      onPlotClick: '&',
      onPlotHover: '&',
      onPlotSelected: '&'
    },
    link: function (scope, element, attributes) {
      var plot = null;
      var width = attributes.width || '100%';
      var height = attributes.height || '100%';

      // Bug: Passing a jQuery object causes an infinite loop within Angular. Fail hard telling
      // users that they should pass us a jQuery expression as string instead.
      if ((((scope.options || {}).legend || {}).container) instanceof jQuery) {
        throw new Error('Please use a jQuery expression string with the "legend.container" option.');
      }

      if (!scope.dataset) {
        scope.dataset = [];
      }

      if (!scope.options) {
        scope.options = {
          legend: {
            show: false
          }
        };
      }

      var plotArea = $(element.children()[0]);

      plotArea.css({
        width: width,
        height: height
      });

      var init = function () {
        var plotObj = $.plot(plotArea, scope.dataset, scope.options);

        if (scope.callback) {
          scope.callback(plotObj);
        }

        return plotObj;
      };

      //
      // Events
      //

      plotArea.on('plotclick', function onPlotClick (event, pos, item) {
        $timeout(function onApplyPlotClick () {
          scope.onPlotClick({
            event: event,
            pos: pos,
            item: item
          });
        });
      });

      plotArea.on('plotselected', function onPlotSelected (event, ranges) {
        $timeout(function onApplyPlotSelected () {
          scope.onPlotSelected({
            event: event,
            ranges: ranges
          });
        });
      });

      plotArea.on('plothover', function onPlotHover (event, pos, item) {
        $timeout(function onApplyPlotHover () {
          scope.onPlotHover({
            event: event,
            pos: pos,
            item: item
          });
        });
      });

      //
      // Watches
      //

      var onOptionsChanged = function () {
        plot = init();
      };

      var unwatchOptions = scope.$watch('options', onOptionsChanged, true);

      var onDatasetChanged = function (dataset) {
        if (plot) {
          plot.setData(dataset);
          plot.setupGrid();


          return plot.draw();
        } else {
          plot = init();
        }
      };

      var unwatchDataset = scope.$watch('dataset', onDatasetChanged, true);

      attributes.$observe('width', function (value) {
        if (!value) return;
        width = value;
        plotArea.css('width', value);
      });

      attributes.$observe('height', function (value) {
        if (!value) return;
        height = value;
        plotArea.css('height', value);
      });

      //
      // Tear Down
      //

      element.on('$destroy', function onDestroy () {
        plotArea.off('plotclick');
        plotArea.off('plothover');
        plotArea.off('plotselected');

        plot.destroy();
        unwatchDataset();
        unwatchOptions();
      });
    }
  };
}]);
