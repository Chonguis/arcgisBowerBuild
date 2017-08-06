define([
  "esri/Map",
  "esri/views/SceneView",
  "esri/widgets/Search",
  "esri/layers/SceneLayer",
  "esri/renderers/UniqueValueRenderer",
  "esri/symbols/MeshSymbol3D",
  "esri/symbols/FillSymbol3DLayer",
], function (
  Map,
  SceneView,
  Search,
  SceneLayer,
  UniqueValueRenderer,
  MeshSymbol3D,
  FillSymbol3DLayer
) {
  var map = new Map({
    basemap: "dark-gray",
    ground: "world-elevation"
  });

  var view = new SceneView({
    container: "viewDiv",
    map: map,
    qualityProfile: "high",
    center: [-73.957008, 40.714010],
    zoom: 19,
    tilt: 45,
    heading: 350
  });

  var sceneLayerUrl = 'https://tiles.arcgis.com/tiles/bcDHSZM121V2uZJJ/arcgis/rest/services/MultipleBuildings01/SceneServer';

  var sceneLayer = new SceneLayer({
    url: sceneLayerUrl
  });

  var otherMeshSymbol = new MeshSymbol3D({
    symbolLayers: [new FillSymbol3DLayer({
      material: { color: "white" }
    })]
  });

  function getUniqueValueRenderer(fieldName, colorStart, colorStop, valueStart, valueStop) {
    return new UniqueValueRenderer({
      defaultSymbol: otherMeshSymbol,
      visualVariables: [{
        type: "color",
        field: fieldName,
        stops: [
          {value: valueStart, color: colorStart},
          {value: valueStop, color: colorStop}
        ]
      }]
    });
  }

  var sceneLayerUrlParams = 'https://services7.arcgis.com/bcDHSZM121V2uZJJ/ArcGIS/rest/services/multibuilding/FeatureServer/0/query?f=json&where=1=1&outFields=*'
  var chartData;
  var chartDataJson = [];

  function getJsonData(type, chartColorStart, chartColorStop, chartColor){
    $.getJSON(sceneLayerUrlParams, function(data){
      processMyJson(data, type, chartColorStart, chartColorStop, chartColor);
    });
  }

  function processMyJson(data, type, chartColorStart, chartColorStop, chartColor) {
    //devuelve el array de objetos
    chartData = data.features;
    //convierte la data en json
    // chartDataJson = JSON.stringify(chartData);

    for (var i = 0; i < chartData.length; i++) {
      chartDataJson.push(chartData[i].attributes);
    }

    createChart(chartDataJson, type, chartColorStart, chartColorStop, chartColor);

  }

  function createChart(data, type, chartColorStart, chartColorStop, chartColor) {

    AmCharts.addInitHandler(function(chart) {

      var dataProvider = chart.dataProvider;
      var colorRanges = chart.colorRanges;

      // Based on https://www.sitepoint.com/javascript-generate-lighter-darker-color/
      function ColorLuminance(hex, lum) {

        // validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;

        // convert to decimal and change luminosity
        var rgb = "#",
          c, i;
        for (i = 0; i < 3; i++) {
          c = parseInt(hex.substr(i * 2, 2), 16);
          c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
          rgb += ("00" + c).substr(c.length);
        }

        return rgb;
      }

      if (colorRanges) {

        var item;
        var range;
        var valueProperty;
        var value;
        var average;
        var variation;
        for (var i = 0, iLen = dataProvider.length; i < iLen; i++) {

          item = dataProvider[i];

          for (var x = 0, xLen = colorRanges.length; x < xLen; x++) {

            range = colorRanges[x];
            valueProperty = range.valueProperty;
            value = item[valueProperty];

            if (value >= range.start && value <= range.end) {
              average = (range.start - range.end) / 2;

              if (value <= average)
                variation = (range.variation * -1) / value * average;
              else if (value > average)
                variation = range.variation / value * average;

              item[range.colorProperty] = ColorLuminance(range.color, variation.toFixed(2));
            }
          }
        }
      }

    }, ["serial"]);

    AmCharts.makeChart( "chartdiv", {
      "type": "serial",
      "dataProvider": data,
      "categoryField": "ObjectId_1",
      "sequencedAnimation" : true,
      "startEffect" : "easeInSine",
      "startDuration" : 1,
      "labelText": type,
      "colorRanges":[ {
        "start": chartColorStart,
        "end": chartColorStop,
        "color": chartColor,
        "variation": -0.5,
        "valueProperty": type,
        "colorProperty": "color"
      } ],
      "categoryAxis": {
        "autoGridCount": false,
        "gridCount": chartData.length,
        "gridPosition": "start"
      },
      "graphs": [ {
        "valueField": type,
        "type": "column",
        "fillAlphas": 0.8,
        "colorField": "color",
        "balloonText": `${type}: <b>[[value]]</b>`
      } ],
      "titles": [
        {
          "size": 15,
          "text": type
        }
      ],
    } );
  }


  function setRenderer(type) {
    if (type === "original") {
      sceneLayer.renderer = null;
    } else if (type === "lotArea") {
     // In this case we want to keep the texture unmodified for the buildings we are interested in
     // color and colorMixMode should be set to null, otherwise they default to "white" and "multiply"
      sceneLayer.renderer = getUniqueValueRenderer("LotArea","#f7fcb9", "#31a354", 0, 30000);
      getJsonData("LotArea", 0, 30000, "#31a354");
      chartDataJson = [];
    } else if (type === "floorCount") {
     // We apply a color to make buildings stand out, but we also want to keep the texture, so we use tint
      sceneLayer.renderer = getUniqueValueRenderer("R11_FloorCount_n","#f9f2f2", "#3f0b0b", 0, 20);
      getJsonData("R11_FloorCount_n", 0, 20, "#3f0b0b");
      chartDataJson = [];
    } else if (type === "gfa"){
      sceneLayer.renderer = getUniqueValueRenderer("R12_GFAPodium_max","#ECEFFF", "#0A1B7C", 0, 25000);
      getJsonData("R12_GFAPodium_max", 0, 25000, "#0A1B7C");
      chartDataJson = [];
    } else if (type === "buildableArea") {
      sceneLayer.renderer = getUniqueValueRenderer("R02_BuildableArea_sum","#F9E198", "#7C5F0A", 0, 25000);
      getJsonData("R02_BuildableArea_sum", 0, 25000, "#7C5F0A");
      chartDataJson = [];
    } else if (type === "BuiltFAR") {
      sceneLayer.renderer = getUniqueValueRenderer("BuiltFAR","#FFD0ED", "#B01878", 0, 5);
      getJsonData("BuiltFAR", 0, 5, "#B01878");
      chartDataJson = [];
    }
  }

  document.getElementById("colorMixMode").addEventListener("change",
    function(evt) {
      setRenderer(evt.target.id);
    });

  view.ui.add("colorMixMode", "bottom-right");

  var searchWidget = new Search({
    view: view
  }, "searchDiv");

  map.add(sceneLayer);

});
