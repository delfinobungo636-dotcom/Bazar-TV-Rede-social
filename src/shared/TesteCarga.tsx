import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function TesteCarga() {
  const [status, setStatus] = useState('');

  const rodarTesteRobusto = async (quantidade: number) => {
    setStatus(`A iniciar ataque de ${quantidade} utilizadores...`);
    const functions = getFunctions();
    const solicitarAcesso = httpsCallable(functions, 'solicitarAcessoVideo');

    let sucessos = 0;
    let bloqueios = 0;

    // Dispara a carga
    const promessas = Array.from({ length: quantidade }).map(async (_, index) => {
      try {
        // 1. Tenta aceder
        await solicitarAcesso({ movieId: "filme_teste", deviceId: `user_${index}` });
        sucessos++;
        
        // 2. SIMULAÇÃO: O browser tenta carregar o vídeo
        const video = document.createElement('video');
        video.src = "https://firebasestorage.googleapis.com/v0/b/bazar-tv.firebasestorage.app/o/hero_images%2Fhero_banner_1773697098612?alt=media&token=20346741-b76b-49ad-a072-b37e7baa4d5d"; // COLOCA AQUI UM LINK DE UM VÍDEO TEU
        video.load(); 
      } catch (err: any) {
        if (err.message === 'BLOCK_LIMIT') bloqueios++;
      }
    });

    await Promise.all(promessas);
    setStatus(`CONCLUÍDO: ${sucessos} entraram | ${bloqueios} bloqueados.`);
  };

  return (
    <div className="p-10 bg-black border-4 border-yellow-500 text-center">
      <button 
        onClick={() => rodarTesteRobusto(1000)}
        className="bg-yellow-500 text-black font-black py-6 px-10 rounded-2xl"
      >
        TESTAR 1000 UTILIZADORES REAIS
      </button>
      <p className="text-white mt-4">{status}</p>
    </div>
  );
}