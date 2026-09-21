import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function Novelas() {
  return (
    <MediaCatalog 
      filterBy="category" 
      targetValue="novelas" 
      title="Novelas & Dramas " 
    />
  );
}