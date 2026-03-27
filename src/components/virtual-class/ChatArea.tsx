import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  Mic,
  MicOff,
  Pencil,
  Phone,
  Plus,
  Forward,
  Reply,
  Send,
  Trash2,
  Users2,
  WifiOff,
  X,
} from 'lucide-react';
import type { ChatMessage, ForwardInfo } from '@/hooks/useChat';
import type { ReplyInfo as DmReplyInfo } from '@/hooks/useDirectMessages';
import type { ReplyInfo as GroupReplyInfo } from '@/hooks/useGroupChat';
import type { NetworkStatus } from '@/hooks/useWebRTC';
import type { DirectMessage } from '@/shared/api/friends';
import type { GroupMessage } from '@/shared/api/groups';
import MediaGalleryModal from './MediaGalleryModal';

type ReplyInfo = DmReplyInfo | GroupReplyInfo;

interface RoomChatProps {
  mode: 'room';
  roomId: string | null;
  messages: ChatMessage[];
  currentUserId: string | null;
  isVoiceActive: boolean;
  networkStatus: NetworkStatus;
  isMuted: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onToggleMute: () => void;
  onSend: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onForwardSnapshot?: (snapshot: ForwardInfo) => void;
  status: 'idle' | 'waiting' | 'connected';
}

interface DirectChatProps {
  mode: 'direct';
  friendName: string;
  friendAvatar: string | null;
  messages: DirectMessage[];
  currentUserId: string | null;
  loading: boolean;
  isConnected?: boolean;
  onSend: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onForwardSnapshot?: (snapshot: ForwardInfo) => void;
  /** Черновик пересылки над полем ввода (после выбора чата в модалке) */
  pendingForward?: ForwardInfo | null;
  onCancelPendingForward?: () => void;
  onHeaderClick?: () => void;
  /** Trigger a direct audio call to this friend */
  onStartCall?: () => void;
}

interface GroupChatProps {
  mode: 'group';
  groupName: string;
  memberCount: number;
  inviteToken: string;
  messages: GroupMessage[];
  currentUserId: string | null;
  loading: boolean;
  isConnected?: boolean;
  onSend: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onForwardSnapshot?: (snapshot: ForwardInfo) => void;
  pendingForward?: ForwardInfo | null;
  onCancelPendingForward?: () => void;
}

type Props = RoomChatProps | DirectChatProps | GroupChatProps;

// ─── Network status badge ─────────────────────────────────────────────────────
const NETWORK_STATUS_LABELS: Record<NetworkStatus, { label: string; color: string }> = {
  idle: { label: '', color: '' },
  connecting: { label: 'Подключение…', color: 'text-amber-500' },
  connected: { label: 'Связь хорошая', color: 'text-emerald-500' },
  reconnecting: { label: 'Переподключение…', color: 'text-amber-500' },
  failed: { label: 'Связь потеряна', color: 'text-red-500' },
};

// ─── Quoted block inside a message bubble ────────────────────────────────────
function QuotedBlock({
  replyToText,
  replyToSender,
  isMine,
  onJump,
}: {
  replyToText: string;
  replyToSender: string;
  isMine: boolean;
  onJump: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onJump(); }}
      className={`mb-2 flex w-full cursor-pointer items-stretch gap-0 overflow-hidden rounded-lg text-left transition-opacity hover:opacity-75 active:scale-[0.98] ${
        isMine
          ? 'bg-white/20'
          : 'bg-gray-200/70'
      }`}
    >
      {/* accent line */}
      <span className={`w-[3px] shrink-0 rounded-l-lg ${isMine ? 'bg-white/60' : 'bg-purple'}`} />

      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <p className={`mb-0.5 text-[10px] font-bold leading-tight tracking-wide ${isMine ? 'text-white/80' : 'text-purple'}`}>
          {replyToSender || 'Сообщение'}
        </p>
        <p className={`line-clamp-2 text-[11px] leading-snug ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
          {replyToText}
        </p>
      </div>
    </button>
  );
}

/** Telegram-style «Переслано от …» block with nested text/media snapshot. */
function ForwardedBlock({
  forwardFromName,
  innerText,
  mediaUrl,
  mediaType,
  isMine,
  renderMediaFn,
}: {
  forwardFromName: string;
  innerText?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isMine: boolean;
  renderMediaFn: (mediaUrl?: string | null, mediaType?: string | null) => ReactNode;
}) {
  return (
    <div
      className={`mb-1 overflow-hidden rounded-lg text-left ${
        isMine ? 'bg-white/15' : 'bg-gray-200/80'
      }`}
    >
      <div className={`flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
        <Forward className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        <span>Переслано от</span>
        <span className={`truncate ${isMine ? 'text-white' : 'text-purple'}`}>{forwardFromName}</span>
      </div>
      <div className={`px-2.5 pb-2 ${isMine ? 'text-white/95' : 'text-gray-800'}`}>
        {innerText?.trim() ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{innerText}</p>
        ) : null}
        {renderMediaFn(mediaUrl, mediaType)}
      </div>
    </div>
  );
}

function buildForwardSnapshotFromMsg(
  item: {
    rawMsg: ChatMessage | DirectMessage | GroupMessage;
    senderLabel?: string;
    isMine: boolean;
  },
  resolvedSender: string,
): ForwardInfo {
  const msg = item.rawMsg;
  const author =
    ('forward_from_name' in msg && msg.forward_from_name) ||
    resolvedSender ||
    'Неизвестно';
  const textLines = [msg.text?.trim(), msg.forward_original_text?.trim()].filter(Boolean) as string[];
  const combinedText = textLines.join('\n\n');
  let mediaUrl: string | null | undefined;
  let mediaType: string | null | undefined;
  if ('forward_media_url' in msg && msg.forward_media_url) {
    mediaUrl = msg.forward_media_url;
    mediaType = msg.forward_media_type ?? undefined;
  } else if ('media_url' in msg && msg.media_url) {
    mediaUrl = msg.media_url;
    mediaType = msg.media_type ?? undefined;
  } else if ('mediaUrl' in msg && msg.mediaUrl) {
    mediaUrl = msg.mediaUrl;
    mediaType = msg.mediaType ?? undefined;
  }
  return {
    senderName: author,
    text: combinedText || '',
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType === 'image' || mediaType === 'video' ? mediaType : undefined,
  };
}

export default function ChatArea(props: Props) {
  const [inputText, setInputText] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [pendingMediaPreviewUrl, setPendingMediaPreviewUrl] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  type CtxMenu = { x: number; y: number; msgId: string; isMine: boolean; text: string; senderName: string; snapshot: ForwardInfo };
  const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const messageCount = props.messages.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messageCount]);

  useEffect(() => {
    if (!pendingMediaFile) {
      setPendingMediaPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(pendingMediaFile);
    setPendingMediaPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [pendingMediaFile]);

  // Clear selection + close context menu when clicking empty area
  const handleListClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIds(new Set());
      setContextMenu(null);
    }
  };

  // ─── Jump to original message ─────────────────────────────────────────────
  const jumpToMessage = useCallback((id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-msg-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1500);
  }, []);

  const forwardSnapshotValid = (f: ForwardInfo | null) =>
    Boolean(
      f?.senderName &&
        (f.text?.trim() || (f.mediaUrl && f.mediaType)),
    );

  const pendingForwardCompose =
    'pendingForward' in props ? props.pendingForward ?? null : null;
  const fwdComposeOk = forwardSnapshotValid(pendingForwardCompose);

  // ─── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && !pendingMediaFile && !fwdComposeOk) return;

    if (editingMessageId) {
      if (text) {
        if (props.mode === 'room') props.onEditMessage(editingMessageId, text);
        if (props.mode === 'direct') props.onEditMessage(editingMessageId, text);
        if (props.mode === 'group') props.onEditMessage(editingMessageId, text);
      }
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    if (pendingMediaFile) {
      await props.onSendMedia(pendingMediaFile, text);
      setPendingMediaFile(null);
      setPendingMediaPreviewUrl(null);
      setInputText('');
      setReplyingTo(null);
      if ('onCancelPendingForward' in props && props.onCancelPendingForward) {
        props.onCancelPendingForward();
      }
      return;
    }

    props.onSend(
      text,
      replyingTo ?? undefined,
      pendingForwardCompose ?? undefined,
    );
    setInputText('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
    if (e.key === 'Escape') {
      if (contextMenu) { setContextMenu(null); return; }
      if (selectedIds.size > 0) { setSelectedIds(new Set()); return; }
      if (pendingForwardCompose && 'onCancelPendingForward' in props && props.onCancelPendingForward) {
        props.onCancelPendingForward();
        return;
      }
      if (replyingTo) { setReplyingTo(null); return; }
      if (editingMessageId) { setEditingMessageId(null); setInputText(''); }
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) return;
    if ('onCancelPendingForward' in props && props.onCancelPendingForward) {
      props.onCancelPendingForward();
    }
    setPendingMediaFile(selectedFile);
  };

  const handleInputPaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const mediaItem = Array.from(event.clipboardData.items).find((i) =>
      i.type.startsWith('image/'),
    );
    if (!mediaItem) return;
    const pastedFile = mediaItem.getAsFile();
    if (!pastedFile) return;
    event.preventDefault();
    if ('onCancelPendingForward' in props && props.onCancelPendingForward) {
      props.onCancelPendingForward();
    }
    setPendingMediaFile(pastedFile);
  };

  // ─── Multi-select helpers ─────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => props.onDeleteMessage(id));
    setSelectedIds(new Set());
  };

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const renderMedia = (mediaUrl?: string | null, mediaType?: string | null) => {
    if (!mediaUrl || !mediaType) return null;
    if (mediaType === 'image') {
      return (
        <img
          src={mediaUrl}
          alt="photo"
          className="mt-2 max-h-64 w-full cursor-pointer rounded-lg object-cover"
          onClick={() => window.open(mediaUrl, '_blank')}
        />
      );
    }
    if (mediaType === 'video') {
      return (
        <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Видео отправлено
        </div>
      );
    }
    return null;
  };

  // ─── Compose box (shared) ─────────────────────────────────────────────────
  const composeBox = (
    <div className="border-t border-gray-100 px-4 py-3">
      {/* Reply indicator */}
      {replyingTo && !editingMessageId && !pendingForwardCompose && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-purple bg-purple/5 px-3 py-2">
          <Reply className="h-3.5 w-3.5 shrink-0 text-purple" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-purple">{replyingTo.senderName}</p>
            <p className="truncate text-xs text-gray-500">{replyingTo.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {pendingForwardCompose && !editingMessageId && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-sky-500 bg-sky-50 px-3 py-2">
          <Forward className="h-3.5 w-3.5 shrink-0 text-sky-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-sky-800">Переслано от {pendingForwardCompose.senderName}</p>
            <p className="truncate text-xs text-gray-600">
              {pendingForwardCompose.text?.trim() || (pendingForwardCompose.mediaUrl ? 'Медиа' : '')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if ('onCancelPendingForward' in props && props.onCancelPendingForward) {
                props.onCancelPendingForward();
              }
            }}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Editing indicator */}
      {editingMessageId && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">Режим редактирования сообщения</p>
          <button
            onClick={() => { setEditingMessageId(null); setInputText(''); }}
            className="text-[11px] font-medium text-amber-700 hover:underline"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Media preview */}
      {pendingMediaFile && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
          <div className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
            {pendingMediaPreviewUrl ? (
              <img src={pendingMediaPreviewUrl} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-gray-400">Фото</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-700">{pendingMediaFile.name}</p>
            <p className="text-[11px] text-gray-400">Будет отправлено вместе с сообщением</p>
          </div>
          <button
            onClick={() => { setPendingMediaFile(null); setPendingMediaPreviewUrl(null); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { void handleFileSelected(e); }} />
        <button onClick={handleFileClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10 text-purple transition-colors hover:bg-purple/20"
          title="Прикрепить фото">
          <Plus className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => { void handleInputPaste(e); }}
          placeholder={
            editingMessageId
              ? 'Изменить сообщение…'
              : pendingForwardCompose
                ? 'Комментарий к пересылке…'
                : replyingTo
                  ? 'Ответить…'
                  : 'Сообщение…'
          }
          className="flex-1 rounded-xl bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple/20"
        />
        <button
          onClick={() => { void handleSend(); }}
          disabled={
            (!inputText.trim() && !pendingMediaFile && !fwdComposeOk)
            || (Boolean(editingMessageId) && !inputText.trim())
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple text-white transition-colors hover:bg-purple/90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // ─── Selection bar (appears when ≥1 message selected) ────────────────────
  const selectionBar = selectedIds.size > 0 ? (
    <div className="flex shrink-0 items-center justify-between border-b border-purple/10 bg-purple/5 px-4 py-2.5">
      <button
        onClick={() => setSelectedIds(new Set())}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/70"
        title="Снять выделение"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold text-gray-700">
        {selectedIds.size}{' '}
        {selectedIds.size === 1 ? 'сообщение' : selectedIds.size >= 2 && selectedIds.size <= 4 ? 'сообщения' : 'сообщений'}
      </span>
      <button
        onClick={handleDeleteSelected}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
        title="Удалить выбранные"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  // ─── Right-click context menu ─────────────────────────────────────────────
  const ctxMenuJSX = contextMenu ? (
    <div
      ref={contextMenuRef}
      className="fixed z-[200] min-w-[180px] overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-2xl"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        onClick={() => {
          if ('onCancelPendingForward' in props && props.onCancelPendingForward) {
            props.onCancelPendingForward();
          }
          setReplyingTo({ id: contextMenu.msgId, text: contextMenu.text || '(медиафайл)', senderName: contextMenu.senderName });
          setContextMenu(null);
        }}
      >
        <Reply className="h-4 w-4 text-gray-400" />
        Ответить
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
        disabled={
          !forwardSnapshotValid(contextMenu.snapshot)
          || !('onForwardSnapshot' in props && props.onForwardSnapshot)
        }
        onClick={() => {
          if (!forwardSnapshotValid(contextMenu.snapshot)) return;
          if ('onForwardSnapshot' in props && props.onForwardSnapshot) {
            props.onForwardSnapshot(contextMenu.snapshot);
          }
          setReplyingTo(null);
          setContextMenu(null);
        }}
      >
        <Forward className="h-4 w-4 text-gray-400" />
        Переслать в другой чат…
      </button>
      {contextMenu.isMine && (
        <button
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          onClick={() => {
            setEditingMessageId(contextMenu.msgId);
            setInputText(contextMenu.text);
            setContextMenu(null);
          }}
        >
          <Pencil className="h-4 w-4 text-gray-400" />
          Редактировать
        </button>
      )}
      {contextMenu.isMine && (
        <>
          <div className="mx-3 my-1 h-px bg-gray-100" />
          <button
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
            onClick={() => {
              props.onDeleteMessage(contextMenu.msgId);
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </>
      )}
    </div>
  ) : null;

  // ─── Message status icon (DM only, own messages) ─────────────────────────
  const MsgStatusIcon = ({ isRead }: { isRead: boolean }) => (
    <svg
      viewBox="0 0 18 9"
      className={`inline-block h-[9px] w-[18px] shrink-0 ${isRead ? 'text-sky-300' : 'text-white/45'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={isRead ? 'Прочитано' : 'Отправлено'}
    >
      {/* first tick */}
      <polyline points="1,5 4,8 9,1" />
      {/* second tick — visible only when read */}
      {isRead && <polyline points="6,5 9,8 14,1" />}
    </svg>
  );

  // ─── Shared message bubble renderer ──────────────────────────────────────
  type MsgItem = {
    id: string;
    isMine: boolean;
    text: string;
    time: string;
    senderLabel?: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    replyToId?: string | null;
    replyToText?: string | null;
    replyToSender?: string | null;
    forwardFromName?: string | null;
    forwardOriginalText?: string | null;
    forwardMediaUrl?: string | null;
    forwardMediaType?: string | null;
    /** DM only — undefined means no status indicator */
    isRead?: boolean;
    rawMsg: ChatMessage | DirectMessage | GroupMessage;
  };

  const renderBubble = (item: MsgItem) => {
    const isMultiSelected = selectedIds.has(item.id);
    const isHighlighted = highlightedId === item.id;
    const inSelectionMode = selectedIds.size > 0;
    const friendLabel = props.mode === 'direct' ? props.friendName : undefined;
    const resolvedSender = item.senderLabel ?? (item.isMine ? 'Вы' : (friendLabel ?? ''));

    const handleBubbleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setContextMenu(null);
      toggleSelect(item.id);
    };

    const handleBubbleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Position menu so it doesn't overflow viewport
      const menuX = Math.min(e.clientX, window.innerWidth - 195);
      const menuY = e.clientY + 145 > window.innerHeight ? e.clientY - 130 : e.clientY + 6;
      const snapshot = buildForwardSnapshotFromMsg(item, resolvedSender);
      setContextMenu({
        x: menuX,
        y: menuY,
        msgId: item.id,
        isMine: item.isMine,
        text: item.text || '',
        senderName: resolvedSender,
        snapshot,
      });
    };

    // Checkbox indicator (appears in selection mode)
    const checkbox = (
      <div
        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
        className={`shrink-0 cursor-pointer transition-all duration-200 ${inSelectionMode ? 'w-5 opacity-100' : 'w-0 overflow-hidden opacity-0'}`}
      >
        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
          isMultiSelected ? 'border-purple bg-purple' : 'border-gray-300 bg-white'
        }`}>
          {isMultiSelected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    );

    return (
      <div
        key={item.id}
        data-msg-id={item.id}
        className={`flex items-end gap-2 transition-all duration-200 ${item.isMine ? 'justify-end' : 'justify-start'}`}
      >
        {/* Checkbox for non-own messages */}
        {!item.isMine && checkbox}

        <div
          className={`max-w-[72%] select-none rounded-2xl px-4 py-2.5 transition-all ${
            item.isMine
              ? `rounded-br-sm bg-purple text-white ${isMultiSelected ? 'opacity-75 ring-2 ring-purple/60 ring-offset-1' : ''}`
              : `rounded-bl-sm bg-gray-100 text-gray-800 ${isMultiSelected ? 'opacity-75 ring-2 ring-purple/40 ring-offset-1' : ''}`
          } ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''} cursor-pointer`}
          onClick={handleBubbleClick}
          onContextMenu={handleBubbleContextMenu}
        >
          {/* Sender name (group / room) */}
          {item.senderLabel && !item.isMine && (
            <p className="mb-0.5 text-[11px] font-semibold opacity-60">{item.senderLabel}</p>
          )}

          {/* Quoted block */}
          {item.replyToText && (
            <QuotedBlock
              replyToText={item.replyToText}
              replyToSender={item.replyToSender ?? ''}
              isMine={item.isMine}
              onJump={() => jumpToMessage(item.replyToId ?? '')}
            />
          )}

          {item.forwardFromName && item.text?.trim() ? (
            <p className="mb-2 break-words text-sm leading-relaxed">{item.text}</p>
          ) : null}

          {item.forwardFromName ? (
            <ForwardedBlock
              forwardFromName={item.forwardFromName}
              innerText={item.forwardOriginalText}
              mediaUrl={item.forwardMediaUrl}
              mediaType={item.forwardMediaType}
              isMine={item.isMine}
              renderMediaFn={renderMedia}
            />
          ) : (
            <>
              <p className="break-words text-sm leading-relaxed">{item.text}</p>
              {renderMedia(item.mediaUrl, item.mediaType)}
            </>
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${item.isMine ? 'text-white/50' : 'text-gray-400'}`}>
            <span>{item.time}</span>
            {item.isMine && item.isRead !== undefined && (
              <MsgStatusIcon isRead={item.isRead} />
            )}
          </div>
        </div>

        {/* Checkbox for own messages */}
        {item.isMine && checkbox}
      </div>
    );
  };

  // ─── Room chat mode ───────────────────────────────────────────────────────
  if (props.mode === 'room') {
    const networkInfo = NETWORK_STATUS_LABELS[props.networkStatus];

    const items: MsgItem[] = props.messages.map((msg) => ({
      id: msg.id,
      isMine: msg.fromUserId === props.currentUserId,
      text: msg.text,
      time: new Date(msg.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      senderLabel: msg.fromUserId !== props.currentUserId ? msg.fromUserId : undefined,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      replyToId: msg.reply_to_id,
      replyToText: msg.reply_to_text,
      replyToSender: msg.reply_to_sender,
      forwardFromName: msg.forward_from_name,
      forwardOriginalText: msg.forward_original_text,
      forwardMediaUrl: msg.forward_media_url,
      forwardMediaType: msg.forward_media_type,
      rawMsg: msg,
    }));

    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {ctxMenuJSX}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            {props.status === 'connected' && (
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            )}
            <span className="font-medium text-gray-700">
              {props.roomId ? (
                <>Комната <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">{props.roomId}</code></>
              ) : (
                'Комната чата'
              )}
            </span>
            {networkInfo.label && (
              <span className={`ml-1 flex items-center gap-1 text-[10px] font-medium ${networkInfo.color}`}>
                {props.networkStatus === 'failed' && <WifiOff className="h-3 w-3" />}
                {networkInfo.label}
              </span>
            )}
          </div>

          {props.status === 'connected' && (
            <div className="flex items-center gap-2">
              {/* Mute toggle */}
              {props.isVoiceActive && (
                <button
                  onClick={props.onToggleMute}
                  title={props.isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    props.isMuted
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {props.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
              )}
              {/* Start/stop voice */}
              <button
                onClick={props.isVoiceActive ? props.onStopVoice : props.onStartVoice}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  props.isVoiceActive
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-purple/10 text-purple hover:bg-purple/20'
                }`}
              >
                {props.isVoiceActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {props.isVoiceActive ? 'Завершить' : 'Звонок'}
              </button>
            </div>
          )}
        </div>

        {selectionBar}

        <div
          ref={messageListRef}
          className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
          onClick={handleListClick}
        >
          {props.messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-gray-400">
              {props.status === 'connected' ? 'Напишите первое сообщение…' : 'Подключитесь к пользователю для начала чата'}
            </p>
          )}
          {items.map(renderBubble)}
          <div ref={messagesEndRef} />
        </div>

        {(props.status === 'connected' || props.messages.length > 0) && composeBox}
      </div>
    );
  }

  // ─── Direct Message mode ──────────────────────────────────────────────────
  if (props.mode === 'direct') {
    const items: MsgItem[] = props.messages.map((msg) => ({
      id: String(msg.id),
      isMine: msg.sender_id === props.currentUserId,
      text: msg.text,
      time: new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      replyToId: msg.reply_to_id,
      replyToText: msg.reply_to_text,
      replyToSender: msg.reply_to_sender,
      forwardFromName: msg.forward_from_name,
      forwardOriginalText: msg.forward_original_text,
      forwardMediaUrl: msg.forward_media_url,
      forwardMediaType: msg.forward_media_type,
      // Status indicator only for own messages
      isRead: msg.sender_id === props.currentUserId ? msg.is_read : undefined,
      rawMsg: msg,
    }));

    const isOffline = props.isConnected === false;

    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {ctxMenuJSX}
        {isOffline && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
            <WifiOff className="h-3.5 w-3.5" />
            Нет соединения — сообщения отправятся при восстановлении связи
          </div>
        )}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={props.onHeaderClick}
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple overflow-hidden">
              {props.friendAvatar ? (
                <img src={props.friendAvatar} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                props.friendName.split(' ').map((w) => w[0]?.toUpperCase()).join('').slice(0, 2)
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{props.friendName}</p>
              <p className="text-xs text-gray-400">Личные сообщения • профиль</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Audio call button */}
            {props.onStartCall && (
              <button
                onClick={props.onStartCall}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                title="Аудиозвонок"
              >
                <Phone className="h-3.5 w-3.5" />
                Звонок
              </button>
            )}
            {/* Media gallery button */}
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
              title="Медиафайлы"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Медиа
            </button>
          </div>
        </div>

        {selectionBar}

        <div
          ref={messageListRef}
          className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
          onClick={handleListClick}
        >
          {props.loading && <p className="mt-16 text-center text-sm text-gray-400">Загрузка сообщений…</p>}
          {!props.loading && props.messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-gray-400">Напишите первое сообщение…</p>
          )}
          {items.map(renderBubble)}
          <div ref={messagesEndRef} />
        </div>

        {composeBox}

        <MediaGalleryModal
          messages={props.messages}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      </div>
    );
  }

  // ─── Group Chat mode ──────────────────────────────────────────────────────
  const handleCopyGroupLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/virtual-class/group/${props.inviteToken}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const groupItems: MsgItem[] = props.messages.map((msg) => ({
    id: String(msg.id),
    isMine: msg.sender_id === props.currentUserId,
    text: msg.text,
    time: new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
    senderLabel: msg.sender_id !== props.currentUserId
      ? `${msg.sender_first_name} ${msg.sender_last_name}`.trim()
      : undefined,
    mediaUrl: msg.media_url,
    mediaType: msg.media_type,
    replyToId: msg.reply_to_id,
    replyToText: msg.reply_to_text,
    replyToSender: msg.reply_to_sender,
    forwardFromName: msg.forward_from_name,
    forwardOriginalText: msg.forward_original_text,
    forwardMediaUrl: msg.forward_media_url,
    forwardMediaType: msg.forward_media_type,
    rawMsg: msg,
  }));

  const isGroupOffline = props.isConnected === false;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {ctxMenuJSX}
      {isGroupOffline && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Нет соединения — сообщения отправятся при восстановлении связи
        </div>
      )}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple/10">
            <Users2 className="h-4 w-4 text-purple" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{props.groupName}</p>
            <p className="text-xs text-gray-400">{props.memberCount} участников</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Media gallery button */}
          <button
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Медиа
          </button>
          <button
            onClick={handleCopyGroupLink}
            className="flex items-center gap-1.5 rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-semibold text-purple transition-colors hover:bg-purple/20"
          >
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {linkCopied ? 'Скопировано' : 'Ссылка'}
          </button>
        </div>
      </div>

      {selectionBar}

      <div
        ref={messageListRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
        onClick={handleListClick}
      >
        {props.loading && <p className="mt-16 text-center text-sm text-gray-400">Загрузка сообщений…</p>}
        {!props.loading && props.messages.length === 0 && (
          <p className="mt-16 text-center text-sm text-gray-400">Напишите первое сообщение…</p>
        )}
        {groupItems.map(renderBubble)}
        <div ref={messagesEndRef} />
      </div>

      {composeBox}

      <MediaGalleryModal
        messages={props.messages}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </div>
  );
}
