app.controller('indexCtrl', ['$scope', '$http', '$interval',
  function($scope, $http, $interval) {
    var timer;

    var generateMashPlan = function(recipe, start) {
      var plan = [];
      var time = start;
      var generatedRecord;

      for (index = 0; index < recipe.mash_steps.length; ++index) {
        generatedRecord = {
          timestamp: time.getTime(),
          temperature: recipe.mash_steps[index].temperature
        };
        plan.push(generatedRecord);

        time = new Date(time.getTime() + recipe.mash_steps[index].interval * 60000);

        generatedRecord = {
          timestamp: time.getTime(),
          temperature: recipe.mash_steps[index].temperature
        };
        plan.push(generatedRecord);
      }

      return plan;
    }

    $scope.beertypeSelected = function(selectedBeerType) {
      $scope.selectedBeertypeRecipes = $scope.recipes.filter(function(v) {
        return v.type == $scope.selectedBeerType;
      });
    };

    $scope.recipeSelected = function(selectedRecipe) {
      $http.get($scope.url + '/recipe/' + escape(selectedRecipe.name))
        .then(function(res) {
          var newGoals = [];
          $scope.fullRecipe = res.data;
          $scope.refreshJSONView($scope.fullRecipe);

          var getMashTemperatures = function(element, index, array) {
            newGoals.push(element.temperature);
          }

          var plan = generateMashPlan($scope.fullRecipe, new Date());
          $scope.fullRecipe.mash_steps.forEach(getMashTemperatures);
          $scope.chart.options.goals = newGoals;
          $interval.cancel(timer);
          $scope.chart.options.smooth = false;
          $scope.chart.options.ymin = plan[0].temperature - 3;
          $scope.chart.options.ymax = plan[plan.length - 1].temperature + 3;
          var events = [];
          for (index = 0; index < plan.length; index += 2) {
            events.push(plan[index].timestamp);
          }
          $scope.chart.events = events;
          $scope.chart.setData(plan);
        });
    }

    $scope.refreshJSONView = function(jsonObject) {
      $scope.node = new PrettyJSON.view.Node({
        el: $scope.JSONViewResult,
        data: jsonObject
      });
    }

    $scope.isRefreshChartEnabled = function() {
      return $scope.refreshChartEnabled;
    }

    $scope.enableChartRefresh = function() {
      var chartElement = document.querySelector(".morris-default-style");
      chartElement.style.background = "rgba(255, 255, 255, 0.4)";
      $scope.refreshChartEnabled = true;
    }

    $scope.disableChartRefresh = function() {
      var chartElement = document.querySelector(".morris-default-style");
      chartElement.style.background = "rgba(255, 150, 150, 1.0)";
      $scope.refreshChartEnabled = false;
    }

    $scope.startChartRefresh = function() {
      timer = $interval($scope.refresh, 1500);
    }

    $scope.refresh = function() {
      if ($scope.isRefreshChartEnabled()) {
        $.getJSON($scope.url + "/temperatures/100", function(x) {
          var data = x.records; // use data as a generic object
          $scope.currentTemperature = data[data.length - 1].temperature;
          if (typeof $scope.chart == "undefined") {
            $scope.spinner.stop();
            $scope.createChart(data);
          } else {
            $scope.chart.setData(data);
          }
        });
      }
    }

    $scope.createChart = function(data) {
      $scope.chart = new Morris.Line({
        // ID of the element in which to draw the chart.
        element: 'tempChart',
        // Chart data records -- each entry in this array corresponds to a point on
        // the chart.
        data: data,
        // The name of the data record attribute that contains x-values.
        xkey: 'timestamp',
        // A list of names of data record attributes that contain y-values.
        ykeys: ['temperature'],
        // Labels for the ykeys -- will be displayed when you hover over the
        // chart.
        labels: ['Actual Temperature'],
        xLabels: 'minute',
        postUnits: [' °C'],
        lineColors: ['#000000', '#FF0000'],
        //events: ['2014-09-02 19:00:00', '2014-09-02 19:00:08'],
        goals: [0],
        //xLabelFormat: function(x) {
        //    var pad = '00';
        //    var elapsed = x - start;
        //    var hours = Math.floor(elapsed / 1000 / 60 / 60);
        //    var minutes = (pad + Math.floor(elapsed / 1000 / 60) % 60).slice(-pad.length);
        //    var seconds = (pad + Math.floor((elapsed / 1000) % 60)).slice(-pad.length);

        //    return hours + ':' + minutes + ':' + seconds;
        //},
        pointSize: 4,
        gridEnabled: true,
        resize: true,
        hoverCallback: function(index, options, content, row) {
          return (new Date(row.timestamp)).toLocaleTimeString() + "   " + row.temperature + " °C";
        },
        ymax: 85,
        ymin: 10,
        eventStrokeWidth: 3,
        goalStrokeWidth: 3
      });
    }

    // brewmmer url prefix
    $scope.url = 'http://conoyes.synology.me:3551';
    $scope.refreshChartEnabled = true;
    $scope.fullRecipe = '';
    $scope.JSONViewResult = document.getElementById("result");
    $scope.currentTemperature = '';

    // loader variables
    $scope.spinnerOpts = {
      lines: 11, // The number of lines to draw
      length: 14, // The length of each line
      width: 6, // The line thickness
      radius: 10, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 0, // The rotation offset
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#000', // #rgb or #rrggbb or array of colors
      speed: 1.6, // Rounds per second
      trail: 73, // Afterglow percentage
      shadow: true, // Whether to render a shadow
      hwaccel: false, // Whether to use hardware acceleration
      className: 'spinner', // The CSS class to assign to the spinner
      zIndex: 2e9, // The z-index (defaults to 2000000000)
      top: '50%', // Top position relative to parent
      left: '50%' // Left position relative to parent
    };
    $scope.spinnerTarget = document.getElementById('tempChart');
    $scope.spinner = new Spinner($scope.spinnerOpts).spin($scope.spinnerTarget);

    //load beer types
    $http.get($scope.url + '/recipes')
      .then(function(res) {
        $scope.recipes = res.data.records;
        $scope.beertypes = $scope.recipes.map(function(recipe) {
          return recipe.type;
        }).filter(function(v, i, a) {
          return a.indexOf(v) == i;
        })
      });
  }
]);
