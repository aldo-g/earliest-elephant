import React, { useState } from 'react';
import WorldMap from './components/WorldMap';
import InfoModal from './components/InfoModal';
import './index.css';

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleCountryClick = (countryData) => {
    setSelectedCountry(countryData);
  };

  const handleCloseModal = () => {
    setSelectedCountry(null);
  };

  return (
    // This is now our main container for positioning
    <div className="app-container">
      <WorldMap onCountryClick={handleCountryClick} />

      {/* The title is no longer in its own div. CSS will place it on top of the map. */}
      <h1>Earliest Elephant 🐘🗺️</h1>

      <InfoModal data={selectedCountry} onClose={handleCloseModal} />
    </div>
  );
}

export default App;