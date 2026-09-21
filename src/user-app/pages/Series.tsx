import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function Series() {
  return (
    <MediaCatalog 
      filterBy="type" 
      targetValue="series" 
      title="Séries & Maratonas " 
    />
  );
}