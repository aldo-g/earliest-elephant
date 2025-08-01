import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const WorldMap = ({ onCountryClick }) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState(null);
  const [elephantData, setElephantData] = useState(null);

  // NEW: State to hold the current zoom/pan transformation
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // This function will be called by D3 when a zoom/pan event happens
  const handleZoom = useCallback((event) => {
    setTransform(event.transform);
  }, []);

  // Effect to set up the D3 zoom behavior
  useEffect(() => {
    if (!dimensions.width || !svgRef.current) return;

    // Create the zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 8]) // Min zoom is 1x (original size), max is 8x
      .translateExtent([[0, 0], [dimensions.width, dimensions.height]]) // Constrain panning to the map's boundaries
      .on('zoom', handleZoom); // Attach our handler

    // Apply the zoom behavior to the SVG element
    d3.select(svgRef.current).call(zoomBehavior);

  }, [dimensions, handleZoom]);


  // Effect to measure the container size (no changes here)
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

  // Effect to fetch data (no changes here)
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

  return (
    <svg ref={svgRef} width={dimensions.width} height={dimensions.height}>
      <defs>
        {Array.from(elephantData.values()).map(d => (
          <pattern key={d.countryCode} id={`img-${d.countryCode}`} patternUnits="objectBoundingBox" width="1" height="1">
            <image href={d.imageUrl} x="0" y="0" width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        ))}
      </defs>
      {/* NEW: The <g> tag now has a transform attribute driven by our state */}
      <g transform={transform.toString()}>
        {countries.map(c => {
          const countryElephantData = elephantData.get(c.id);
          // UPDATED: Using a nicer blue color for the fallback
          const fill = countryElephantData ? `url(#img-${c.id})` : '#a9d3f5'; 

          return (
            <path
              key={c.id}
              d={pathGenerator(c)}
              className="country"
              fill={fill}
              stroke={transform.k > 1.5 ? "#fff" : "#aaa"} // Thinner strokes when zoomed out
              strokeWidth={0.5 / transform.k} // Make stroke thinner as we zoom in
              onClick={() => countryElephantData && onCountryClick(countryElephantData)}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default WorldMap;