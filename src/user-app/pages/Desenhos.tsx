import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function Desenhos() {
  return (
    <MediaCatalog 
      filterBy="category" 
      targetValue="desenhos" 
      title="Desenhos & Animes " 
    />
  );
}