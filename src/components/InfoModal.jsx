import React, { useState } from 'react';

const InfoModal = ({ data, onClose }) => {
  const [storyIndex, setStoryIndex] = useState(0);

  if (!data) return null;

  const handleNext = () => {
    setStoryIndex(prevIndex => (prevIndex + 1) % data.story.length);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>X</button>
        <h2>{data.elephantName} in {data.countryName} ({data.arrivalYear})</h2>
        <img src={data.imageUrl} alt={data.elephantName} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
        <p>{data.story[storyIndex]}</p>
        {data.story.length > 1 && (
          <button onClick={handleNext}>
            Learn More ({storyIndex + 1}/{data.story.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default InfoModal;