import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function Comedia() {
  return (
    <MediaCatalog 
      filterBy="category" 
      targetValue="comédia" 
      title="Comédia " 
    />
  );
}