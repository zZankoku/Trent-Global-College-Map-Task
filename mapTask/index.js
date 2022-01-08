let singapore = [1.29, 103.85];
let map = L.map("singapore-map");
map.setView(singapore, 13);

L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken:
      "pk.eyJ1IjoiemFjLXRyZW50LXByb2plY3QiLCJhIjoiY2tyeWVxY3hoMHZhdDJ1bWsxN2RyeXp1dCJ9.GDOn61ZT9XXWMknAG9-KZA",
  }
).addTo(map);

full_layer = null;
food_layer = null;
market_layer = null;
num_stalls_layer = null;

window.addEventListener("DOMContentLoaded", async () => {
  const response = await axios.get("hawker-centres.geojson");
  const MARKET_RESPONSE = await axios.get(
    "https://data.gov.sg/api/action/datastore_search?resource_id=8f6bba57-19fc-4f36-8dcf-c0bda382364d&limit=250"
  );
  market_data = MARKET_RESPONSE.data.result.records;

  // type_of_centre: MHC for market and HC for food
  // Change to 0 market stores for food and all others for market
  let geo_postal_re = /(?:ADDRESS_MYENV).*[\s\/](\d{6})(?:<\/td>|<\\\/td>)/;

  for (index in response.data.features) {
    // Get postal for each feature
    feature = response.data.features[index];
    postal_group = feature.properties.Description.match(geo_postal_re);
    if (postal_group != null) {
      postal = postal_group["1"];
    } else {
      postal = null;
    }
    response.data.features[index].postal = postal;

    if (postal == null) {
      response.data.features[index].market_type = null;
      response.data.features[index].additional_data = null;
      response.data.features[index].properties.title = null;
      continue;
    }

    // Match market_data to response
    for (market_index in market_data) {
      market = market_data[market_index];
      let postal_re = new RegExp(postal);
      if (postal_re.test(market["location_of_centre"])) {
        // Check if no_of_mkt_produce_stalls == 0
        if (market["no_of_mkt_produce_stalls"] == 0) {
          market_type = "foodie";
        } else {
          market_type = "market";
        }
        response.data.features[index].market_type = market_type;

        // Add title and rest of data to feature
        response.data.features[index].properties.title =
          market["name_of_centre"];
        response.data.features[index].additional_data = market;
        break;
      }
    }
  }

  full_layer = L.geoJson(response.data, {
    onEachFeature: function (feature, layer) {
      displayData = "";
      if (feature.additional_data != null) {
        for (const [key, value] of Object.entries(feature.additional_data)) {
          displayData += "<p>" + key + ": " + value + "</p>";
        }
        layer.bindPopup(displayData);
      }
    },
  });
  full_layer.addTo(map);
  // layer.setStyle({
  //     'color':'blue',
  //     'fillColor':'purple'
  // })

  var MarkerIcon = L.Icon.extend({
    options: {
      iconSize: [20, 20],
    },
  });

  var fireIcon = new MarkerIcon({ iconUrl: "images/FIRE_MARKET.png" });
  num_stalls_layer = L.geoJson(response.data, {
    onEachFeature: function (feature, layer) {
      displayData = "";
      for (const [key, value] of Object.entries(feature.additional_data)) {
        displayData += "<p>" + key + ": " + value + "</p>";
      }
      layer.bindPopup(displayData);
    },
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: fireIcon });
    },
    filter: function (feature, layer) {
      console.log("feat", feature);
      //   return parseInt(feature.additional_data.no_of_stalls) > 100;
      return (
        feature.additional_data &&
        parseInt(feature.additional_data.no_of_stalls) > 100
      );
    },
  });

  var foodIcon = new MarkerIcon({ iconUrl: "images/FOODIE_MARKET.png" });

  food_layer = L.geoJson(response.data, {
    onEachFeature: function (feature, layer) {
      displayData = "";
      for (const [key, value] of Object.entries(feature.additional_data)) {
        displayData += "<p>" + key + ": " + value + "</p>";
      }
      layer.bindPopup(displayData);
    },
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: foodIcon });
    },
    filter: function (feature, layer) {
      return feature.market_type == "foodie";
    },
  });

  var marketIcon = new MarkerIcon({ iconUrl: "images/MARKET_MARKET.png" });

  market_layer = L.geoJson(response.data, {
    onEachFeature: function (feature, layer) {
      displayData = "";
      for (const [key, value] of Object.entries(feature.additional_data)) {
        displayData += "<p>" + key + ": " + value + "</p>";
      }
      layer.bindPopup(displayData);
    },
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: marketIcon });
    },
    filter: function (feature, layer) {
      return feature.market_type == "market";
    },
  });

  L.control
    .search({
      layer: full_layer,
      initial: false,
      propertyName: "title", // Specify which property is searched into. Default to title
    })
    .addTo(map);
});

// Toggle all markets
document.querySelector("#toggle-btn1").addEventListener("click", function () {
  if (map.hasLayer(full_layer)) {
    map.removeLayer(full_layer);
  } else {
    map.addLayer(full_layer);
  }
});

// Toggle food markets
document.querySelector("#toggle-btn2").addEventListener("click", function () {
  if (map.hasLayer(food_layer)) {
    map.removeLayer(food_layer);
  } else {
    map.addLayer(food_layer);
  }
});

// Toggle market markets
document.querySelector("#toggle-btn3").addEventListener("click", function () {
  if (map.hasLayer(market_layer)) {
    map.removeLayer(market_layer);
  } else {
    map.addLayer(market_layer);
  }
});

// Toggle widespread markets
document.querySelector("#toggle-btn4").addEventListener("click", function () {
  if (map.hasLayer(num_stalls_layer)) {
    map.removeLayer(num_stalls_layer);
  } else {
    map.addLayer(num_stalls_layer);
  }
});

// Toggle single marker
// document.querySelector('')
