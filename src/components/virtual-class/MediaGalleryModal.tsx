/**
 * MediaGalleryModal — quick viewer for all media shared in the current chat.
 *
 * Groups all messages with attachments into three tabs: Images, Videos, Documents.
 * Clicking an image opens a full-screen lightbox overlay.
 */

import { useEffect, useRef, useState } from 'react';
import { FileText, Film, Image, X, ZoomIn } from 'lucide-react';
import type { DirectMessage } from '@/shared/api/friends';
import type { GroupMessage } from '@/shared/api/groups';
import type { ChatMessage } from '@/hooks/useChat';

type AnyMessage = DirectMessage | GroupMessage | ChatMessage;

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  fileName?: string;
  caption?: string;
}

function extractMediaItems(messages: AnyMessage[]): MediaItem[] {
  const items: MediaItem[] = [];

  for (const msg of messages) {
    let url: string | null | undefined;
    let type: string | null | undefined;
    let id: string;
    let caption: string | undefined;

    if ('media_url' in msg) {
      url = msg.media_url;
      type = msg.media_type;
      id = String(msg.id);
      caption = msg.text || undefined;
    } else if ('mediaUrl' in msg) {
      url = msg.mediaUrl;
      type = msg.mediaType;
      id = String(msg.id);
      caption = msg.text || undefined;
    } else {
      continue;
    }

    if (!url) continue;

    const mediaType: MediaItem['type'] =
      type === 'image' ? 'image' : type === 'video' ? 'video' : 'document';

    items.push({ id, url, type: mediaType, caption });
  }

  return items;
}

type Tab = 'images' | 'videos' | 'documents';

interface Props {
  messages: AnyMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaGalleryModal({ messages, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('images');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) {
          setLightboxUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, lightboxUrl, onClose]);

  if (!isOpen) return null;

  const allItems = extractMediaItems(messages);
  const images = allItems.filter((i) => i.type === 'image');
  const videos = allItems.filter((i) => i.type === 'video');
  const documents = allItems.filter((i) => i.type === 'document');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'images', label: 'Изображения', count: images.length },
    { key: 'videos', label: 'Видео', count: videos.length },
    { key: 'documents', label: 'Документы', count: documents.length },
  ];

  const currentItems = activeTab === 'images' ? images : activeTab === 'videos' ? videos : documents;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      >
        <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          style={{ maxHeight: '80vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-bold text-gray-800">Медиафайлы</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 px-4 pt-2">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-b-2 border-purple text-purple'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {key === 'images' && <Image className="h-3.5 w-3.5" />}
                {key === 'videos' && <Film className="h-3.5 w-3.5" />}
                {key === 'documents' && <FileText className="h-3.5 w-3.5" />}
                {label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    activeTab === key ? 'bg-purple/10 text-purple' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                {activeTab === 'images' && <Image className="mb-3 h-10 w-10 text-gray-200" />}
                {activeTab === 'videos' && <Film className="mb-3 h-10 w-10 text-gray-200" />}
                {activeTab === 'documents' && <FileText className="mb-3 h-10 w-10 text-gray-200" />}
                <p className="text-sm text-gray-400">Нет медиафайлов</p>
              </div>
            ) : activeTab === 'images' ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLightboxUrl(item.url)}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            ) : activeTab === 'videos' ? (
              <div className="flex flex-col gap-3">
                {videos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Film className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">
                        {item.fileName ?? 'Видеофайл'}
                      </p>
                      {item.caption && (
                        <p className="truncate text-xs text-gray-400">{item.caption}</p>
                      )}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      Открыть
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {documents.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">
                        {item.fileName ?? 'Документ'}
                      </p>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-100"
                    >
                      Скачать
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
