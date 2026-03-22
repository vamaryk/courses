import React, { useRef, useCallback, useEffect } from 'react';
import { Image, Video, Heading2, Heading3 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Для загрузки изображений в контент (опционально) */
  courseId?: number;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Введите текст...',
  className = '',
  disabled = false,
  courseId,
  onUploadImage,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedValueRef = useRef<string>(value);
  const isEmpty = !value || value.replace(/<[^>]*>/g, '').trim().length === 0;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Do not rewrite innerHTML while typing, otherwise caret jumps to the start.
    if (document.activeElement === editor) return;

    if (editor.innerHTML !== value) {
      editor.innerHTML = value || '';
      lastSyncedValueRef.current = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = editor.innerHTML;
    if (nextValue !== lastSyncedValueRef.current) {
      lastSyncedValueRef.current = nextValue;
      onChange(nextValue);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const setHeading = useCallback((tag: 'h2' | 'h3') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('formatBlock', false, tag);
    handleInput();
  }, [handleInput]);

  const insertHtml = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('insertHTML', false, html);
    handleInput();
  }, [handleInput]);

  const handleInsertImageByUrl = useCallback(() => {
    const url = window.prompt('Введите URL изображения:');
    if (url?.trim()) {
      insertHtml(`<img src="${url.replace(/"/g, '&quot;')}" alt="" style="max-width:100%;height:auto;" />`);
    }
  }, [insertHtml]);

  const handleInsertImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadImage) return;
    try {
      const { url } = await onUploadImage(file);
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      insertHtml(`<img src="${fullUrl}" alt="" style="max-width:100%;height:auto;" />`);
    } catch (err) {
      console.error('Upload image failed:', err);
    }
  }, [onUploadImage, insertHtml]);

  const handleInsertVideo = useCallback(() => {
    const url = window.prompt('Введите URL видео (YouTube, или прямая ссылка на .mp4/.webm):');
    if (!url?.trim()) return;
    const u = url.trim();
    const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      const embed = `https://www.youtube.com/embed/${ytMatch[1]}`;
      insertHtml(`<div class="video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="${embed}" frameborder="0" allowfullscreen></iframe></div>`);
    } else {
      insertHtml(`<video src="${u.replace(/"/g, '&quot;')}" controls style="max-width:100%;"></video>`);
    }
  }, [insertHtml]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      execCommand('insertLineBreak');
    }
  }, [execCommand]);

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Жирный"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Курсив"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Подчеркнутый"
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => setHeading('h2')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Заголовок 2 — выделите текст и нажмите"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setHeading('h3')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Заголовок 3 — выделите текст и нажмите"
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => (onUploadImage ? fileInputRef.current?.click() : handleInsertImageByUrl())}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить изображение"
        >
          <Image className="w-4 h-4" />
        </button>
        {onUploadImage && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInsertImageFile}
          />
        )}
        <button
          type="button"
          onClick={handleInsertVideo}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить видео (URL или YouTube)"
        >
          <Video className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Маркированный список"
        >
          • список
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Нумерованный список"
        >
          1. список
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По левому краю"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По центру"
        >
          ↔
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По правому краю"
        >
          →
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none z-10">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={`
            min-h-[200px] p-3 border border-gray-300 border-t-0 rounded-b-md
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
          style={{
            display: 'block',
            maxWidth: '100%',
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflowX: 'hidden',
          }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;