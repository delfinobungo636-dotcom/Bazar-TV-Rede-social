import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase'; 
import { Play, Search as SearchIcon } from 'lucide-react';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryTerm = searchParams.get('q') || '';
  
  const [allContent, setAllContent] = useState<any[]>([]); // Para recomendações
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Carregar todo o catálogo para ter recomendações prontas (Estilo Netflix)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "movies"), where("active", "==", true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllContent(data);
        
        // Se não houver busca, mostramos tudo como recomendação
        if (!queryTerm.trim()) {
          setFilteredResults(data);
        }
      } catch (error) {
        console.error("Erro ao carregar catálogo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [queryTerm]); // Adicionado queryTerm aqui para garantir atualização

  // 2. Filtro Inteligente (Ajusta conforme digita sem perder performance)
  useEffect(() => {
    if (!queryTerm.trim()) {
      setFilteredResults(allContent);
    } else {
      const term = queryTerm.toLowerCase();
      
      const filtered = allContent.filter((item: any) => {
        // 🚀 O NOVO MOTOR DE PESQUISA: Procura no Título, Categoria ou Tipo!
        const matchTitle = (item.title || '').toLowerCase().includes(term);
        const matchCategory = (item.category || '').toLowerCase().includes(term);
        const matchType = (item.type || '').toLowerCase().includes(term);
        
        return matchTitle || matchCategory || matchType;
      });
      
      setFilteredResults(filtered);
    }
  }, [queryTerm, allContent]);

  // Função para o botão Play funcionar redirecionando para o Player
  const handlePlay = (id: string) => {
    navigate(`/watch/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 font-sans">
      {/* Cabeçalho Dinâmico */}
      <div className="px-6 md:px-12 mb-8">
        <header className="flex flex-col gap-2 border-l-4 border-red-600 pl-4">
          <span className="text-zinc-500 text-xs uppercase tracking-widest font-black">Bazar TV Explorer</span>
          <h1 className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
            {queryTerm ? `Resultados: ${queryTerm}` : "Recomendados para Você"}
          </h1>
        </header>
      </div>

      <div className="px-6 md:px-12">
        {loading ? (
          // Grade de Skeletons com limites de Grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-zinc-900 animate-pulse rounded-md border border-white/5" />
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          /* 🚀 GRID DE RESULTADOS */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {filteredResults.map((item) => (
              <div key={item.id} className="group relative flex flex-col bg-zinc-900/30 rounded-lg overflow-hidden transition-all duration-500 hover:scale-105 hover:z-20 shadow-2xl hover:shadow-red-600/20">
                
                {/* 🚀 CORREÇÃO: Puxando a capa diretamente para eliminar o conflito e o 2º botão play */}
                <img 
                  src={item.thumbnailUrl || item.image || item.poster || "https://via.placeholder.com/300x450/141414/ffffff?text=Sem+Capa"} 
                  alt={item.title}
                  className="w-full aspect-[2/3] object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Overlay do Botão Play Único (Funcional) */}
                <div 
                  onClick={() => handlePlay(item.id)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer z-10"
                >
                    <button className="bg-white text-black p-4 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-500">
                      <Play fill="currentColor" size={28} />
                    </button>
                    <span className="text-white text-[10px] font-black uppercase tracking-tighter drop-shadow-md">
                        Reproduzir
                    </span>
                </div>

                {/* Info inferior estilizada (Sempre visível para dar contexto) */}
                <div className="p-3 bg-zinc-900 border-t border-white/5 relative z-20">
                   <h3 className="text-white text-[11px] font-bold truncate uppercase tracking-tighter">{item.title}</h3>
                   <div className="flex items-center justify-between mt-1">
                      <span className="text-zinc-500 text-[9px] font-medium uppercase">{item.category}</span>
                      <span className="text-red-600 text-[9px] font-black px-1 border border-red-600 rounded-sm">HD</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Estado de Busca Vazia */
          <div className="flex flex-col items-center justify-center py-40 text-center animate-in zoom-in duration-500">
             <div className="relative mb-6">
                <SearchIcon size={80} className="text-zinc-800" />
                <div className="absolute inset-0 blur-3xl bg-red-600/10 rounded-full" />
             </div>
             <p className="text-zinc-400 font-bold tracking-widest text-lg uppercase">
               Nenhum título encontrado
             </p>
             <p className="text-zinc-600 text-sm mt-2 max-w-xs italic">
               Não encontramos resultados para "{queryTerm}". Tente outros termos.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;