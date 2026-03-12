import { useEffect, useRef, useState } from 'react';
import { Copy, Check, Mic, MicOff, Plus, Send, Users2, X } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useChat';
import type { DirectMessage } from '@/shared/api/friends';
import type { GroupMessage } from '@/shared/api/groups';

interface RoomChatProps {
  mode: 'room';
  roomId: string | null;
  messages: ChatMessage[];
  currentUserId: string | null;
  isVoiceActive: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onSend: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  status: 'idle' | 'waiting' | 'connected';
}

interface DirectChatProps {
  mode: 'direct';
  friendName: string;
  friendAvatar: string | null;
  messages: DirectMessage[];
  currentUserId: string | null;
  loading: boolean;
  onSend: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onHeaderClick?: () => void;
}

interface GroupChatProps {
  mode: 'group';
  groupName: string;
  memberCount: number;
  inviteToken: string;
  messages: GroupMessage[];
  currentUserId: string | null;
  loading: boolean;
  onSend: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

type Props = RoomChatProps | DirectChatProps | GroupChatProps;

export default function ChatArea(props: Props) {
  const [inputText, setInputText] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [pendingMediaPreviewUrl, setPendingMediaPreviewUrl] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [pendingMediaFile]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && !pendingMediaFile) return;

    if (editingMessageId) {
      if (props.mode === 'room') props.onEditMessage(editingMessageId, text);
      if (props.mode === 'direct') props.onEditMessage(editingMessageId, text);
      if (props.mode === 'group') props.onEditMessage(editingMessageId, text);
      setEditingMessageId(null);
      setSelectedMessageId(null);
      setInputText('');
      return;
    }

    if (pendingMediaFile) {
      await props.onSendMedia(pendingMediaFile, text);
      setPendingMediaFile(null);
      setPendingMediaPreviewUrl(null);
      setInputText('');
      return;
    }

    props.onSend(text);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) return;

    setPendingMediaFile(selectedFile);
  };

  const handleInputPaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const clipboardItems = Array.from(event.clipboardData.items);
    const mediaItem = clipboardItems.find((item) => item.type.startsWith('image/'));
    if (!mediaItem) return;

    const pastedFile = mediaItem.getAsFile();
    if (!pastedFile) return;

    event.preventDefault();
    setPendingMediaFile(pastedFile);
  };

  const renderMedia = (mediaUrl?: string | null, mediaType?: string | null) => {
    if (!mediaUrl || !mediaType) return null;
    if (mediaType === 'image') {
      return <img src={mediaUrl} alt="photo" className="mt-2 max-h-64 w-full rounded-lg object-cover" />;
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

  const composeBox = (
    <div className="border-t border-gray-100 px-4 py-3">
      {editingMessageId && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">Режим редактирования сообщения</p>
          <button
            onClick={() => {
              setEditingMessageId(null);
              setSelectedMessageId(null);
              setInputText('');
            }}
            className="text-[11px] font-medium text-amber-700 hover:underline"
          >
            Отмена
          </button>
        </div>
      )}
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
            onClick={() => {
              setPendingMediaFile(null);
              setPendingMediaPreviewUrl(null);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            title="Убрать фото"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => { void handleFileSelected(event); }}
      />
      <button
        onClick={handleFileClick}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10 text-purple transition-colors hover:bg-purple/20"
        title="Прикрепить фото или видео"
      >
        <Plus className="h-4 w-4" />
      </button>
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={(event) => { void handleInputPaste(event); }}
        placeholder={editingMessageId ? 'Изменить сообщение…' : 'Сообщение…'}
        className="flex-1 rounded-xl bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple/20"
      />
      <button
        onClick={() => { void handleSend(); }}
        disabled={(!inputText.trim() && !pendingMediaFile) || (Boolean(editingMessageId) && !inputText.trim())}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple text-white transition-colors hover:bg-purple/90 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
      </div>
    </div>
  );

  // ─── Room chat mode ───────────────────────────────────────────────────────
  if (props.mode === 'room') {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
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
          </div>
          {props.status === 'connected' && (
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
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {props.messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-gray-400">
              {props.status === 'connected' ? 'Напишите первое сообщение…' : 'Подключитесь к пользователю для начала чата'}
            </p>
          )}
          {props.messages.map((msg) => {
            const isMine = msg.fromUserId === props.currentUserId;
            const messageIdKey = msg.id;
            const isSelected = selectedMessageId === messageIdKey;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                  isMine ? 'rounded-br-sm bg-purple text-white' : 'rounded-bl-sm bg-gray-100 text-gray-800'
                } ${isSelected ? 'ring-2 ring-purple/30' : ''}`} onClick={() => setSelectedMessageId(messageIdKey)}>
                  {!isMine && <p className="mb-1 text-[11px] font-semibold opacity-50">{msg.fromUserId}</p>}
                  <p className="break-words text-sm leading-relaxed">{msg.text}</p>
                  {renderMedia(msg.mediaUrl, msg.mediaType)}
                  <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMine && isSelected && (
                    <div className="mt-1 flex justify-end gap-2 text-[10px]">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingMessageId(messageIdKey);
                          setInputText(msg.text || '');
                        }}
                        className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onDeleteMessage(String(msg.id));
                          setSelectedMessageId(null);
                          if (editingMessageId === messageIdKey) {
                            setEditingMessageId(null);
                            setInputText('');
                          }
                        }}
                        className="rounded bg-red-500/80 px-2 py-0.5 text-white hover:bg-red-500"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {(props.status === 'connected' || props.messages.length > 0) && composeBox}
      </div>
    );
  }

  // ─── Direct Message mode ──────────────────────────────────────────────────
  if (props.mode === 'direct') {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={props.onHeaderClick}
          className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
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

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {props.loading && <p className="mt-16 text-center text-sm text-gray-400">Загрузка сообщений…</p>}
          {!props.loading && props.messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-gray-400">Напишите первое сообщение…</p>
          )}
          {props.messages.map((msg) => {
            const isMine = msg.sender_id === props.currentUserId;
            const messageIdKey = String(msg.id);
            const isSelected = selectedMessageId === messageIdKey;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                  isMine ? 'rounded-br-sm bg-purple text-white' : 'rounded-bl-sm bg-gray-100 text-gray-800'
                } ${isSelected ? 'ring-2 ring-purple/30' : ''}`} onClick={() => setSelectedMessageId(messageIdKey)}>
                  <p className="break-words text-sm leading-relaxed">{msg.text}</p>
                  {renderMedia(msg.media_url, msg.media_type)}
                  <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMine && isSelected && (
                    <div className="mt-1 flex justify-end gap-2 text-[10px]">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingMessageId(messageIdKey);
                          setInputText(msg.text || '');
                        }}
                        className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onDeleteMessage(String(msg.id));
                          setSelectedMessageId(null);
                          if (editingMessageId === messageIdKey) {
                            setEditingMessageId(null);
                            setInputText('');
                          }
                        }}
                        className="rounded bg-red-500/80 px-2 py-0.5 text-white hover:bg-red-500"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {composeBox}
      </div>
    );
  }

  // ─── Group Chat mode ──────────────────────────────────────────────────────
  const handleCopyGroupLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/virtual-class/group/${props.inviteToken}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
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
        <button
          onClick={handleCopyGroupLink}
          className="flex items-center gap-1.5 rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-semibold text-purple transition-colors hover:bg-purple/20"
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {linkCopied ? 'Скопировано' : 'Ссылка'}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {props.loading && <p className="mt-16 text-center text-sm text-gray-400">Загрузка сообщений…</p>}
        {!props.loading && props.messages.length === 0 && (
          <p className="mt-16 text-center text-sm text-gray-400">Напишите первое сообщение…</p>
        )}
        {props.messages.map((msg) => {
          const isMine = msg.sender_id === props.currentUserId;
          const messageIdKey = String(msg.id);
          const isSelected = selectedMessageId === messageIdKey;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                isMine ? 'rounded-br-sm bg-purple text-white' : 'rounded-bl-sm bg-gray-100 text-gray-800'
              } ${isSelected ? 'ring-2 ring-purple/30' : ''}`} onClick={() => setSelectedMessageId(messageIdKey)}>
                {!isMine && (
                  <p className="mb-1 text-[11px] font-semibold opacity-60">
                    {msg.sender_first_name} {msg.sender_last_name}
                  </p>
                )}
                <p className="break-words text-sm leading-relaxed">{msg.text}</p>
                {renderMedia(msg.media_url, msg.media_type)}
                <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {isMine && isSelected && (
                  <div className="mt-1 flex justify-end gap-2 text-[10px]">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingMessageId(messageIdKey);
                        setInputText(msg.text || '');
                      }}
                      className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDeleteMessage(msg.id);
                        setSelectedMessageId(null);
                        if (editingMessageId === messageIdKey) {
                          setEditingMessageId(null);
                          setInputText('');
                        }
                      }}
                      className="rounded bg-red-500/80 px-2 py-0.5 text-white hover:bg-red-500"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {composeBox}
    </div>
  );
}
