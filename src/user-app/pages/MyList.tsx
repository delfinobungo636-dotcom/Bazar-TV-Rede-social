import React from 'react';
import MediaCatalog from '../components/MediaCatalog';

export default function MyList() {
  // Nota: Depois teremos de criar uma lógica especial para "Favoritos", 
  // mas por agora usamos isto para a página não dar erro com o TypeScript.
  return (
    <MediaCatalog 
      filterBy="category" 
      targetValue="mylist" 
      title="Minha Lista ⭐️" 
    />
  );
}