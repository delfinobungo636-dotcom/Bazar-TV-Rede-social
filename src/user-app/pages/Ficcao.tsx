import React from 'react';
import MediaCatalog from '../components/MediaCatalog'; // Ajusta este caminho se a pasta for diferente

export default function Ficcao() {
    return (
        <MediaCatalog
            filterBy="category"
            targetValue="ficcao"
            title="Ficção Científica 🛸"
            //accentColor="#0ea5e9"
            emptyMessage="Ainda não há filmes de ficção. O futuro está por escrever!"
        />
    );
}