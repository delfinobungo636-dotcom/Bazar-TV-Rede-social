// CommentsPanel.tsx — V8 (Atualizado com Hook Dia/Noite)
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, arrayUnion, arrayRemove, increment, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { Heart, X, Send, Pencil, Trash2, Loader2, CornerDownRight } from 'lucide-react';

const useTimeBasedTheme = (): boolean => {
  const [isDayTime, setIsDayTime] = useState<boolean>(true);
  useEffect(() => {
    const checkTime = () => { const hour = new Date().getHours(); setIsDayTime(hour >= 6 && hour < 19); };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);
  return isDayTime;
};

export interface CommentItem { id: string; text: string; userId: string; userName: string; userImage?: string; createdAt: any; isEdited?: boolean; likedBy?: string[]; parentId?: string | null; }

export const CommentsPanel: React.FC<any> = ({ clipId, initialCommentsCount, onClose, onCommentsCountChange }) => {
  const { user, userData } = useAuth();
  const isDay = useTimeBasedTheme();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setCommentsCount(initialCommentsCount); }, [initialCommentsCount]);

  useEffect(() => {
    let cancelled = false;
    setEditingCommentId(null); setEditText(''); setReplyingTo(null); setNewCommentText('');
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const snap = await getDocs(query(collection(db, 'clips', clipId, 'comments'), orderBy('createdAt', 'asc')));
        if (!cancelled) setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommentItem)));
      } catch (err) { console.error(err); if (!cancelled) setComments([]); } finally { if (!cancelled) setLoadingComments(false); }
    };
    fetchComments();
    return () => { cancelled = true; };
  }, [clipId]);

  const handleSubmitComment = async () => {
    if (!user) return alert("Precisas de estar autenticado para comentar.");
    const trimmedText = newCommentText.trim();
    if (!trimmedText) return;
    setPostingComment(true);
    try {
      const commentData = { text: trimmedText, userId: user.uid, userName: userData?.name || user.displayName || 'Membro', userImage: userData?.profileImage || '', createdAt: serverTimestamp(), likedBy: [], parentId: replyingTo?.id || null };
      const commentRef = await addDoc(collection(db, 'clips', clipId, 'comments'), commentData);
      await updateDoc(doc(db, 'clips', clipId), { commentsCount: increment(1) });
      setComments(prev => [...prev, { id: commentRef.id, ...commentData, createdAt: Timestamp.now() }]);
      const newCount = commentsCount + 1;
      setCommentsCount(newCount); onCommentsCountChange(clipId, newCount);
      setNewCommentText(''); setReplyingTo(null);
      if (textareaRef.current) textareaRef.current.style.height = '60px';
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { alert('Erro ao publicar.'); } finally { setPostingComment(false); }
  };

  const handleLikeComment = async (comment: CommentItem) => {
    if (!user) return alert("Precisas de autenticar.");
    const commentRef = doc(db, 'clips', clipId, 'comments', comment.id);
    const userLiked = comment.likedBy?.includes(user.uid);
    try {
      if (userLiked) { await updateDoc(commentRef, { likedBy: arrayRemove(user.uid) }); setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likedBy: c.likedBy?.filter(id => id !== user.uid) } : c)); } 
      else { await updateDoc(commentRef, { likedBy: arrayUnion(user.uid) }); setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likedBy: [...(c.likedBy || []), user.uid] } : c)); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteComment = async (commentId: string) => {
    const isTopLevel = comments.find(c => c.id === commentId)?.parentId == null;
    const replies = isTopLevel ? comments.filter(c => c.parentId === commentId) : [];
    const totalToRemove = 1 + replies.length;
    if (!window.confirm("Apagar comentário?")) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'clips', clipId, 'comments', commentId));
      replies.forEach(r => batch.delete(doc(db, 'clips', clipId, 'comments', r.id)));
      await batch.commit();
      await updateDoc(doc(db, 'clips', clipId), { commentsCount: increment(-totalToRemove) });
      const idsToRemove = new Set([commentId, ...replies.map(r => r.id)]);
      setComments(prev => prev.filter(c => !idsToRemove.has(c.id)));
      const newCount = Math.max(0, commentsCount - totalToRemove);
      setCommentsCount(newCount); onCommentsCountChange(clipId, newCount);
    } catch (err) { alert('Erro ao apagar.'); }
  };

  const bgClass = isDay ? 'bg-white' : 'bg-[#141414]';
  const textClass = isDay ? 'text-black' : 'text-white';
  const borderClass = isDay ? 'border-zinc-200' : 'border-zinc-800';
  const inputBgClass = isDay ? 'bg-zinc-100' : 'bg-zinc-900';

  return (
    <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className={`${bgClass} ${textClass} w-full max-w-lg h-[85vh] max-h-[88vh] rounded-t-3xl border-t ${borderClass} flex flex-col shadow-2xl relative overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${borderClass} select-none flex-shrink-0 z-10`}>
          <span className="font-black text-xs uppercase tracking-wider">{commentsCount} Comentários</span>
          <button onClick={onClose} className="p-1.5 rounded-full transition-colors opacity-70 hover:opacity-100"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loadingComments ? (
            <div className="text-center text-xs font-bold uppercase py-10 flex flex-col items-center gap-2 text-zinc-500"><Loader2 size={18} className="animate-spin text-red-500" /> A carregar...</div>
          ) : comments.filter(c => !c.parentId).map((c) => (
            <div key={c.id} className="space-y-3">
              <div className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0"><img src={c.userImage || `https://ui-avatars.com/api/?name=${c.userName}`} alt="" className="w-full h-full" /></div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold">{c.userName}</span>
                  <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <button onClick={() => handleLikeComment(c)} className={`flex items-center gap-1 text-[10px] font-bold ${c.likedBy?.includes(user?.uid || '') ? 'text-red-500' : 'text-zinc-500'}`}><Heart size={12} className={c.likedBy?.includes(user?.uid || '') ? 'fill-red-500' : ''} /> {c.likedBy?.length || 'Gosto'}</button>
                    <button onClick={() => { setReplyingTo({ id: c.id, userName: c.userName }); setTimeout(() => textareaRef.current?.focus(), 50); }} className="text-[10px] font-bold text-zinc-500">Responder</button>
                    {c.userId === user?.uid && <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] font-bold text-red-500 opacity-0 group-hover:opacity-100">Apagar</button>}
                  </div>
                </div>
              </div>
              {comments.filter(r => r.parentId === c.id).map(r => (
                <div key={r.id} className={`flex items-start gap-2.5 pl-10 border-l ml-4 ${borderClass}`}>
                  <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden shrink-0"><img src={r.userImage || `https://ui-avatars.com/api/?name=${r.userName}`} alt="" className="w-full h-full" /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold">{r.userName}</span>
                    <p className="text-[11px] mt-0.5 whitespace-pre-wrap break-words">{r.text}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <button onClick={() => handleLikeComment(r)} className={`flex items-center gap-1 text-[9px] font-bold ${r.likedBy?.includes(user?.uid || '') ? 'text-red-500' : 'text-zinc-500'}`}><Heart size={10} className={r.likedBy?.includes(user?.uid || '') ? 'fill-red-500' : ''} /> {r.likedBy?.length || 'Gosto'}</button>
                      {r.userId === user?.uid && <button onClick={() => handleDeleteComment(r.id)} className="text-[9px] font-bold text-red-500 opacity-0 hover:opacity-100">Apagar</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        <div className={`flex-shrink-0 ${isDay ? 'bg-zinc-50' : 'bg-[#161616]'} border-t ${borderClass} z-20 pb-4`}>
          {replyingTo && <div className={`flex items-center justify-between px-4 py-1.5 ${inputBgClass} border-b ${borderClass} text-[11px]`}><span>A responder a <strong>{replyingTo.userName}</strong></span><button onClick={() => setReplyingTo(null)}><X size={13} /></button></div>}
          <div className="px-3 pt-2.5 flex items-end gap-2">
            <textarea ref={textareaRef} value={newCommentText} onChange={e => setNewCommentText(e.target.value)} placeholder="Escreve um comentário..." className={`flex-1 ${inputBgClass} ${textClass} border ${borderClass} rounded-xl px-3 py-2.5 text-xs outline-none resize-none`} style={{ height: '50px' }} />
            <button onClick={handleSubmitComment} disabled={!newCommentText.trim() || postingComment} className="bg-red-600 disabled:opacity-50 text-white p-2.5 rounded-xl mb-1"><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;