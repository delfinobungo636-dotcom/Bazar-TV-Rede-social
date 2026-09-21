import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // 🚀 VOLTEI A LIGAR O USELOCATION
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, analyticsPromise } from '../../../shared/services/firebase';
import { logEvent } from 'firebase/analytics';
import VideoPlayer, { Episode, Subtitle } from '../../components/player/VideoPlayer';
import { useAuth } from '../../../modules/auth/auth.hooks'; // Importação do teu hook de autenticação

export interface BazarContent {
  id?: string;
  title: string;
  videoUrl: string;
  description?: string;
  genre?: string;
  seriesId?: string;
  season?: number;
  number?: number;
  thumbnailUrl?: string;
  seriesTitle?: string;
  subtitles?: Subtitle[];
}

const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // 🚀 O SALVA-VIDAS ESTÁ AQUI
  const { user } = useAuth() as any; // Puxa o utilizador logado para indexar a sessão de forma segura

  const [content, setContent] = useState<BazarContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [allEpisodes, setAllEpisodes] = useState<BazarContent[]>([]);

  // Referência única da sessão isolada por Usuário + Filme
  const getSessionRef = (movieId: string) => {
    const uid = user?.uid || 'guest';
    return doc(db, "active_sessions", `session_${uid}_${movieId}`);
  };

  const startSession = async (movieId: string, title: string) => {
    if (!user?.uid) return;
    try {
      await setDoc(getSessionRef(movieId), {
        userId: user.uid,
        movieId: movieId,
        title: title,
        status: "watching",
        lastActive: Date.now() // Timestamp milissegundos numérico para o Heartbeat
      });
      setSessionActive(true);

      const analytics = await analyticsPromise;
      if (analytics) {
        logEvent(analytics, 'video_play_bazar', {
          content_name: title,
          content_id: movieId,
          genre: content?.genre || 'Geral'
        });
      }
    } catch (e) {
      console.error("Erro telemetria/analytics:", e);
    }
  };

  const endSession = async (movieId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(getSessionRef(movieId));
      setSessionActive(false);
    } catch (e) {
      console.error("Erro ao fechar telemetria:", e);
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        // 1. TENTA O FIREBASE PRIMEIRO (Para os filmes normais com Legendas)
        let docRef = doc(db, "movies", id);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          docRef = doc(db, "episodes", id);
          docSnap = await getDoc(docRef);
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          const finalContent: BazarContent = {
            id: docSnap.id,
            title: data.title || "Sem Título",
            videoUrl: data.videoUrl || "",
            description: data.description || "",
            genre: data.genre || "Bazar TV",
            seriesId: data.seriesId,
            season: data.season,
            number: data.number,
            thumbnailUrl: data.thumbnailUrl,
            seriesTitle: data.seriesTitle,
            subtitles: data.subtitles || []
          };
          setContent(finalContent);
          await startSession(id, finalContent.title);
        } else {
          // 2. O SALVA-VIDAS DO HERO SECTION!
          if (location.state && (location.state as any).videoUrl) {
            const fallbackData = location.state as BazarContent;
            setContent({
              ...fallbackData,
              id: id // Garante que o ID "hero" não se perde
            });
            await startSession(id, fallbackData.title || "Sem Título");
          } else {
            navigate(-1);
          }
        }
      } catch (error) {
        console.error("Erro no Firebase:", error);
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchContent();
    }

    return () => {
      if (id) endSession(id);
    };
  }, [id, navigate, location.state, user]);

  // 🚀 LOOP HEARTBEAT: Atualiza o Firestore em background a cada 10s se mantiver a aba aberta
  useEffect(() => {
    if (!sessionActive || !id || !user) return;

    const interval = setInterval(async () => {
      try {
        await setDoc(getSessionRef(id), {
          lastActive: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error("Erro ao processar batimento cardíaco síncrono:", e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionActive, id, user]);

  useEffect(() => {
    const fetchSeriesEpisodes = async () => {
      if (content && content.seriesId) {
        try {
          const q = query(
            collection(db, "episodes"),
            where("seriesId", "==", content.seriesId)
          );

          const snapshot = await getDocs(q);
          const episodesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as BazarContent[];

          episodesList.sort((a, b) => {
            const seasonA = a.season || 0;
            const seasonB = b.season || 0;
            if (seasonA !== seasonB) return seasonA - seasonB;
            return (a.number || 0) - (b.number || 0);
          });

          setAllEpisodes(episodesList);
        } catch (error) {
          console.error("Erro ao buscar lista de episódios:", error);
        }
      }
    };

    fetchSeriesEpisodes();
  }, [content?.seriesId]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-4 border-red-600 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-t-2 border-zinc-800 animate-[spin_3s_linear_infinite]"></div>
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-black uppercase tracking-[0.3em] animate-pulse">Bazar TV</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Preparando a sua experiência...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      {content && content.videoUrl ? (
        <VideoPlayer
          content={content as Episode}
          allEpisodes={allEpisodes as Episode[]}
          onClose={() => navigate('/', { state: { returnToModalWithContent: content } })}
          onNavigateToEpisode={(proximoEpisodio) => {
            if (content.id) endSession(content.id);
            navigate(`/watch/${proximoEpisodio.id}`, { replace: true });
          }}
        />
      ) : (
        <div className="h-screen flex flex-col items-center justify-center text-white">
          <p className="mb-4 text-zinc-500">Vídeo indisponível</p>
          <button onClick={() => navigate(-1)} className="bg-red-600 px-8 py-2 rounded font-bold">VOLTAR</button>
        </div>
      )}
    </div>
  );
};

export default WatchPage;