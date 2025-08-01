import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// ========================================================================
// TWEAKS CONFIGURATION
// ========================================================================
const countryTweaks = {
  "124": { // Canada
    scaleFactor: 1.8,
    yOffsetPercent: 0.55,
  },
  "036": { // Austrailia
    scaleFactor: 1,
    yOffsetPercent: 0,
  }
};

const regionData = {
  "AFRICA_CONTINENT": {
    countryIds: [ "999", "012", "024", "072", "108", "120", "140", "148", "178", "180", "204", "226", "231", "232", "262", "266", "270", "288", "324", "384", "404", "426", "430", "434", "450", "454", "466", "478", "504", "508", "516", "562", "566", "624", "646", "686", "694", "706", "710", "716", "728", "729", "732", "748", "768", "788", "800", "818", "834", "854", "894" ],
    tweaks: {
      scaleFactor: 1,
      yOffsetPercent: 0,
    }
  },
  // NEW: Configuration for the Asian elephant region
  "ASIA_ELEPHANT_REGION": {
    countryIds: [ "050", "064", "116", "156", "356", "360", "418", "458", "104", "524", "144", "764", "704" ],
    tweaks: {
        scaleFactor: 1.0,
        yOffsetPercent: 0,
    }
  }
}

const WorldMap = ({ onCountryClick }) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState(null);
  const [elephantData, setElephantData] = useState(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const handleZoom = useCallback((event) => {
    setTransform(event.transform);
  }, []);

  useEffect(() => {
    if (!dimensions.width || !svgRef.current) return;
    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [dimensions.width, dimensions.height]])
      .on('zoom', handleZoom);
    d3.select(svgRef.current).call(zoomBehavior);
  }, [dimensions, handleZoom]);

  useEffect(() => {
    const measure = () => {
      if (svgRef.current) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: svgRef.current.parentElement.clientHeight,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    Promise.all([
      d3.json('/src/data/world-countries.json'),
      d3.json('/src/data/elephant-data.json'),
    ]).then(([worldData, elephantJson]) => {
      const countryFeatures = topojson.feature(worldData, worldData.objects.countries).features;
      const dataMap = new Map(elephantJson.map(d => [d.countryCode, d]));
      setCountries(countryFeatures);
      setElephantData(dataMap);
    });
  }, []);

  if (!countries || !elephantData || !dimensions.width) {
    return <div ref={svgRef} style={{ width: '100%', height: '100%' }}>Loading map...</div>;
  }

  const projection = d3.geoMercator()
    .scale(dimensions.width / 6)
    .translate([dimensions.width / 2, dimensions.height / 1.5]);
  
  const pathGenerator = d3.geoPath().projection(projection);

  // Create a map of all countries that belong to a region for easy lookup
  const regionCountryMap = new Map();
  Object.keys(regionData).forEach(regionKey => {
    regionData[regionKey].countryIds.forEach(countryId => {
      regionCountryMap.set(countryId, regionKey);
    });
  });

  return (
    <svg ref={svgRef} width={dimensions.width} height={dimensions.height}>
      <defs>
        {/* Clip path for single countries (like Canada) */}
        {countries.map(c => {
          if (elephantData.has(c.id) && !regionCountryMap.has(c.id)) {
            return (
              <clipPath key={`clip-${c.id}`} id={`clip-${c.id}`}>
                <path d={pathGenerator(c)} />
              </clipPath>
            );
          }
          return null;
        })}
        {/* Clip paths for each defined region (Africa, Asia) */}
        {Object.keys(regionData).map(regionKey => (
          <clipPath key={`clip-${regionKey}`} id={`clip-${regionKey}`}>
            {countries
              .filter(c => regionData[regionKey].countryIds.includes(c.id))
              .map(c => (
                <path key={`clip-path-${c.id}`} d={pathGenerator(c)} />
              ))
            }
          </clipPath>
        ))}
      </defs>

      <g transform={transform.toString()}>
        {/* Layer 1: Base map with default blue */}
        {countries.map(c => (
          <path
            key={`base-${c.id}`}
            d={pathGenerator(c)}
            fill={'#a9d3f5'}
            stroke={transform.k > 1.5 ? "#fff" : "#aaa"}
            strokeWidth={0.5 / transform.k}
          />
        ))}

        {/* Layer 2: Clipped images for each region */}
        {Object.keys(regionData).map(regionKey => {
          const regionInfo = regionData[regionKey];
          const regionElephantData = elephantData.get(regionKey);
          if (!regionElephantData) return null;

          const regionCountries = countries.filter(c => regionInfo.countryIds.includes(c.id));
          const regionGeometry = { type: "GeometryCollection", geometries: regionCountries.map(c => c.geometry) };
          
          const bounds = pathGenerator.bounds(regionGeometry);
          const width = bounds[1][0] - bounds[0][0];
          const height = bounds[1][1] - bounds[0][1];
          
          const { scaleFactor, yOffsetPercent } = regionInfo.tweaks;
          const imgWidth = width * scaleFactor;
          const imgHeight = height * scaleFactor;
          const imgX = bounds[0][0] - (imgWidth - width) / 2;
          let imgY = bounds[0][1] - (imgHeight - height) / 2;
          imgY += height * yOffsetPercent;

          return (
            <image
              key={`img-${regionKey}`}
              href={regionElephantData.imageUrl}
              clipPath={`url(#clip-${regionKey})`}
              x={imgX} y={imgY} width={imgWidth} height={imgHeight}
              preserveAspectRatio="xMidYMid slice"
            />
          );
        })}

        {/* Layer 3: Clipped images for individual countries */}
        {countries.map(c => {
          const countryElephantData = elephantData.get(c.id);
          if (!countryElephantData || regionCountryMap.has(c.id)) return null;
          
          const tweaks = countryTweaks[c.id] || {};
          const { scaleFactor = 2.0, yOffsetPercent = 0 } = tweaks;
          
          const bounds = pathGenerator.bounds(c);
          const width = bounds[1][0] - bounds[0][0];
          const height = bounds[1][1] - bounds[0][1];
          const imgWidth = width * scaleFactor;
          const imgHeight = height * scaleFactor;
          const imgX = bounds[0][0] - (imgWidth - width) / 2;
          let imgY = bounds[0][1] - (imgHeight - height) / 2;
          imgY += height * yOffsetPercent;
          
          return (
            <image
              key={`img-${c.id}`}
              href={countryElephantData.imageUrl}
              clipPath={`url(#clip-${c.id})`}
              x={imgX} y={imgY} width={imgWidth} height={imgHeight}
              preserveAspectRatio="xMidYMid slice"
            />
          );
        })}

        {/* Layer 4: Interactive layer for hover/clicks */}
        {countries.map(c => {
          const regionKey = regionCountryMap.get(c.id);
          const countryElephantData = elephantData.get(c.id);
          
          let clickData = null;
          if (regionKey) {
            clickData = elephantData.get(regionKey);
          } else if (countryElephantData) {
            clickData = countryElephantData;
          }

          return (
            <path
              key={`interactive-${c.id}`}
              d={pathGenerator(c)}
              fill="transparent"
              className="country-group"
              onClick={() => clickData && onCountryClick(clickData)}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default WorldMap;