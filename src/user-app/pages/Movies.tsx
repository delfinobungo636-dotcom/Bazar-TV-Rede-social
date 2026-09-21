import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function Movies() {
  return (
    <MediaCatalog 
      filterBy="type" 
      targetValue="movie" 
      title="Filmes em Destaque " 
    />
  );
}