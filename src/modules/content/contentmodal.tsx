// src/modules/content/ContentModal.tsx
import React from "react";
import { X, Play } from "lucide-react";
import { Content } from "./content.types";

interface Props {
  open: boolean;
  onClose: () => void;
  content: Content | null;
}

export default function ContentModal({ open, onClose, content }: Props) {
  if (!open || !content) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl w-full max-w-3xl overflow-hidden">

        {/* BANNER */}
        <div
          className="h-64 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${content.banner})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/70 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-white">
            {content.title}
          </h2>

          <p className="text-zinc-400">
            {content.description}
          </p>

          {content.videoUrl && (
            <button className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded text-white">
              <Play size={18} />
              Assistir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
