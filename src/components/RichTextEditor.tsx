import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Video,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns3,
  Table2,
  Plus,
  X,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Bold,
  Italic,
  Underline,
  Type,
  Code as CodeIcon,
  Check,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  courseId?: number;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  onUploadVideo?: (file: File) => Promise<{ url: string }>;
}

// 🔧 Компонент модального окна для редактирования кода
interface CodeEditorModalProps {
  isOpen: boolean;
  codeBlockId: string | null;
  initialCode: string;
  initialLanguage?: string;
  onSave: (code: string, blockId: string | null, language?: string) => void;
  onClose: () => void;
}

const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  isOpen,
  codeBlockId,
  initialCode,
  initialLanguage = '',
  onSave,
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
      setLanguage(initialLanguage);
      setCopied(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialCode, initialLanguage]);

  // 🔧 Синхронизация скролла: вертикальная и горизонтальная
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const lineNumbers = lineNumbersRef.current;
    const textarea = textareaRef.current;
    const innerContainer = innerContainerRef.current;
    
    if (!scrollContainer || !lineNumbers || !textarea || !innerContainer) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = scrollContainer.scrollTop;
      innerContainer.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', handleScroll, { passive: true });
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSave = () => {
    onSave(code, codeBlockId, language);
    onClose();
  };

  // 🔧 Копирование кода
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = code.substring(0, start) + '  ' + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const lineCount = Math.max(1, code.split('\n').length);
  const maxDigits = lineCount.toString().length;
  const lineNumberWidth = Math.max(24, maxDigits * 10 + 16);
  const LINE_HEIGHT = 20;

  const languages = [
    { value: '', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'bash', label: 'Bash' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {codeBlockId ? 'Редактировать код' : 'Вставить код'}
            </h3>
            {/* 🔧 Добавлено скругление для выпадающего списка */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {/* 🔧 Кнопка копирования в режиме редактирования */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              title="Копировать код"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto p-2"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <div 
            ref={innerContainerRef} 
            className="overflow-x-auto" 
            style={{ maxWidth: '100%', scrollbarGutter: 'stable both-edges' }}
          >
            <div className="flex border border-gray-200 rounded-lg overflow-hidden" style={{ minWidth: 0, maxWidth: '100%' }}>
              {/* Номера строк */}
              <div
                ref={lineNumbersRef}
                className="bg-gray-100 border-r border-gray-200 flex-shrink-0 overflow-hidden select-none"
                style={{ width: lineNumberWidth, minWidth: lineNumberWidth }}
              >
                <div 
                  className="py-1.5 pr-2 text-xs text-gray-400 font-mono text-right"
                  style={{ minWidth: lineNumberWidth }}
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        height: `${LINE_HEIGHT}px`,
                        lineHeight: `${LINE_HEIGHT}px`,
                        fontSize: '12px',
                        whiteSpace: 'pre',
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Textarea для кода */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-2 py-1.5 font-mono text-sm bg-white border-0 focus:outline-none focus:ring-0 resize-none"
                style={{ 
                  lineHeight: `${LINE_HEIGHT}px`,
                  fontSize: '12px',
                  minHeight: `${Math.max(5, lineCount) * LINE_HEIGHT}px`,
                  whiteSpace: 'pre',
                  overflowWrap: 'normal',
                  wordBreak: 'normal',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  maxWidth: '100%',
                  minWidth: 0,
                  scrollbarGutter: 'stable both-edges',
                }}
                placeholder="Введите код...&#10;&#10;Tab — отступ&#10;Ctrl+Enter / Cmd+Enter — сохранить"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-xs text-gray-500 mr-auto">Ctrl+Enter / Cmd+Enter — сохранить</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Введите текст...',
  className = '',
  disabled = false,
  courseId,
  onUploadImage,
  onUploadVideo,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSyncedValueRef = useRef<string>(value);
  const isEmpty = !value || value.replace(/<[^>]*>/g, '').trim().length === 0;
  
  // 🔧 Сохраняем позицию курсора перед открытием модального окна
  const savedSelectionRef = useRef<Range | null>(null);

  const [activeMedia, setActiveMedia] = useState<HTMLElement | null>(null);
  const [activeMediaRect, setActiveMediaRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const resizeSessionRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tablePickerHover, setTablePickerHover] = useState<{ rows: number; cols: number }>({ rows: 2, cols: 2 });
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [activeTableRect, setActiveTableRect] = useState<{ left: number; top: number } | null>(null);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCodeBlockId, setEditingCodeBlockId] = useState<string | null>(null);
  const [initialCodeContent, setInitialCodeContent] = useState('');
  const [initialLanguageContent, setInitialLanguageContent] = useState('');

  // 🔧 Синхронизация контента из value в editor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
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
    
    // 🔧 Восстанавливаем сохранённую позицию курсора
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
      savedSelectionRef.current = null;
    }
    
    document.execCommand('insertHTML', false, html);
    handleInput();
  }, [handleInput]);

  const getClosestTag = useCallback((tagName: string): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.anchorNode as Node | null;
    while (node) {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === tagName.toLowerCase()) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }, []);

  const getCurrentTableContext = useCallback(() => {
    const cell = getClosestTag('td') || getClosestTag('th');
    if (!cell) {
      return {
        table: null as HTMLTableElement | null,
        row: null as HTMLTableRowElement | null,
        cell: null as HTMLTableCellElement | null,
      };
    }
    const row = cell.closest('tr') as HTMLTableRowElement | null;
    const table = cell.closest('table') as HTMLTableElement | null;
    return { table, row, cell: cell as HTMLTableCellElement };
  }, [getClosestTag]);

  const normalizeTableStyle = useCallback((table: HTMLTableElement) => {
    table.style.width = table.style.width || '100%';
    table.style.borderCollapse = 'collapse';
    table.style.margin = '4px 0';
    table.querySelectorAll('td,th').forEach((node) => {
      const cell = node as HTMLTableCellElement;
      cell.style.border = '1px solid #d1d5db';
      cell.style.padding = '6px';
      cell.style.verticalAlign = 'top';
    });
  }, []);

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

  const handleInsertVideoFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadVideo) return;
    try {
      const { url } = await onUploadVideo(file);
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      insertHtml(`<video src="${fullUrl}" controls preload="metadata" style="max-width:100%;width:100%;border-radius:6px;"></video>`);
    } catch (err) {
      console.error('Upload video failed:', err);
    }
  }, [onUploadVideo, insertHtml]);

  const syncActiveMediaRect = useCallback(() => {
    if (!activeMedia || !wrapperRef.current) return;
    const wRect = wrapperRef.current.getBoundingClientRect();
    const iRect = activeMedia.getBoundingClientRect();
    setActiveMediaRect({
      left: iRect.left - wRect.left,
      top: iRect.top - wRect.top,
      width: iRect.width,
      height: iRect.height,
    });
  }, [activeMedia]);

  const buildEmbeddedVideoHtml = useCallback((rawUrl: string) => {
    const sanitizedUrl = rawUrl.trim();
    if (!sanitizedUrl) return null;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sanitizedUrl);
    } catch {
      return null;
    }
    const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();
    const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}`;
    
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(pathWithQuery)) {
      return `<video src="${sanitizedUrl.replace(/"/g, '&quot;')}" controls preload="metadata" style="max-width:100%;width:100%;border-radius:6px;"></video>`;
    }
    
    const youtubeMatch =
      sanitizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
      sanitizedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return `<div class="video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="https://www.youtube.com/embed/${youtubeMatch[1]}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    
    const rutubeMatch =
      sanitizedUrl.match(/rutube\.ru\/video\/([a-zA-Z0-9_-]+)/) ||
      sanitizedUrl.match(/rutube\.ru\/play\/embed\/([a-zA-Z0-9_-]+)/) ||
      sanitizedUrl.match(/embed\.rutube\.ru\/play\/embed\/([a-zA-Z0-9_-]+)/);
    if (rutubeMatch) {
      return `<div class="video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="https://rutube.ru/play/embed/${rutubeMatch[1]}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`;
    }
    
    if (host === 'rutube.ru' || host === 'embed.rutube.ru') {
      return `<div class="video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="${sanitizedUrl.replace(/"/g, '&quot;')}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`;
    }
    
    return null;
  }, []);

  const handleInsertVideo = useCallback(() => {
    const url = window.prompt('Введите URL видео (Rutube, YouTube или прямую ссылку на .mp4/.webm/.mov):');
    if (!url?.trim()) return;
    const embedHtml = buildEmbeddedVideoHtml(url);
    if (!embedHtml) {
      window.alert('Поддерживаются Rutube, YouTube и прямые ссылки на видеофайлы (.mp4/.webm/.mov).');
      return;
    }
    insertHtml(embedHtml);
  }, [buildEmbeddedVideoHtml, insertHtml]);

  // 🔧 Извлечение кода и языка из блока
  const extractCodeFromBlock = useCallback((block: HTMLElement): { code: string; language: string } => {
    const codeElement = block.querySelector('code');
    const language = block.getAttribute('data-language') || '';
    if (!codeElement) return { code: '', language };
    
    const clone = codeElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('.code-linenum').forEach(el => el.remove());
    const contentElements = clone.querySelectorAll('.code-content');
    
    const code = contentElements.length > 0 
      ? Array.from(contentElements).map(el => el.textContent || '').join('\n')
      : clone.textContent || '';
      
    return { code, language };
  }, []);

  // 🔧 Генерация КОМПАКТНОГО HTML для блока кода (убраны отступы)
  const generateCodeBlockHtml = useCallback((code: string, blockId: string, language: string = ''): string => {
    const lines = code.split('\n');
    const maxDigits = lines.length.toString().length;
    const lineNumberWidth = Math.max(20, maxDigits * 8 + 12);
    
    const codeRows = lines.map((line, i) => {
      const num = (i + 1).toString().padStart(maxDigits, ' ');
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div class="code-line" style="display:flex;line-height:20px;min-height:20px;">
        <span class="code-linenum" style="color:#6e7681;user-select:none;padding-right:8px;display:inline-block;text-align:right;width:${lineNumberWidth}px;font-variant-numeric:tabular-nums;font-size:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;flex-shrink:0;">${num}</span>
        <span class="code-content" style="flex:1;min-width:0;white-space:pre-wrap;word-wrap:break-word;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;">${escaped || ' '}</span>
      </div>`;
    }).join('');
    
    return `
      <div class="code-block" contenteditable="false" data-code-block="true" data-code-id="${blockId}" data-language="${language}"
           style="background:#1e1e1e;color:#d4d4d4;padding:0;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;margin:4px 0;border:1px solid #333;position:relative;max-width:100%;width:100%;overflow:hidden;">
        <div style="position:absolute;top:6px;right:6px;opacity:0;transition:opacity 0.2s;display:flex;gap:4px;" class="code-edit-btn-wrapper">
          <button type="button" data-copy-code="true" style="background:#333;color:#fff;border:1px solid #555;padding:2px 5px;border-radius:2px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:2px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Копировать</span>
          </button>
          <button type="button" data-edit-code="true" style="background:#333;color:#fff;border:1px solid #555;padding:2px 5px;border-radius:2px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:2px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Редактировать</span>
          </button>
          <button type="button" data-delete-code="true" style="background:#dc2626;color:#fff;border:1px solid #b91c1c;padding:2px 5px;border-radius:2px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:2px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>Удалить</span>
          </button>
        </div>
        ${language ? `<div style="position:absolute;top:6px;left:10px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${language}</div>` : ''}
        <div style="overflow-x:auto;overflow-y:hidden;max-width:100%;scrollbar-gutter:stable both-edges;${language ? 'margin-top:24px' : 'margin-top:0'};">
          <pre style="margin:0;padding:8px 10px;background:transparent;border:0;white-space:pre-wrap;word-wrap:break-word;overflow:visible;line-height:20px;"><code style="display:block;min-width:0;max-width:100%;line-height:20px;font-size:13px;">${codeRows}</code></pre>
        </div>
      </div>
    `;
  }, []);

  // 🔧 Сохраняем позицию курсора перед открытием модального окна
  const handleInsertCode = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      }
    }
    
    setEditingCodeBlockId(null);
    setInitialCodeContent('');
    setInitialLanguageContent('');
    setCodeModalOpen(true);
  }, []);

  const handleSaveCode = useCallback((code: string, blockId: string | null, language?: string) => {
    if (blockId) {
      const editor = editorRef.current;
      if (!editor) return;
      
      const existingBlock = editor.querySelector(`[data-code-id="${blockId}"]`) as HTMLElement;
      if (existingBlock) {
        const newHtml = generateCodeBlockHtml(code, blockId, language);
        const temp = document.createElement('div');
        temp.innerHTML = newHtml;
        const newBlock = temp.querySelector('[data-code-block="true"]') as HTMLElement;
        if (newBlock) {
          existingBlock.replaceWith(newBlock);
          handleInput();
        }
      }
    } else {
      const uniqueId = `code-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const html = generateCodeBlockHtml(code, uniqueId, language);
      insertHtml(html);
    }
  }, [generateCodeBlockHtml, insertHtml, handleInput]);

  // 🔧 Функция для копирования кода
  const handleCopyCode = useCallback(async (codeBlock: HTMLElement) => {
    const { code } = extractCodeFromBlock(codeBlock);
    try {
      await navigator.clipboard.writeText(code);
      // Показываем визуальную обратную связь
      const copyBtn = codeBlock.querySelector('[data-copy-code="true"]') as HTMLElement;
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Скопировано</span>';
        copyBtn.style.background = '#16a34a';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = '#333';
        }, 2000);
      }
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  }, [extractCodeFromBlock]);

  // 🔧 Функция для удаления блока кода
  const handleDeleteCode = useCallback((codeBlock: HTMLElement) => {
    if (window.confirm('Вы уверены, что хотите удалить этот блок кода?')) {
      codeBlock.remove();
      handleInput();
    }
  }, [handleInput]);

  const handleAlignMedia = useCallback(
    (mode: 'left' | 'center' | 'right' | 'full') => {
      const selection = window.getSelection();
      const clickTarget = selection?.anchorNode instanceof HTMLElement ? selection.anchorNode : null;
      const media =
        activeMedia ||
        (clickTarget?.closest?.('img') as HTMLElement | null) ||
        (clickTarget?.closest?.('video') as HTMLElement | null) ||
        (clickTarget?.closest?.('iframe') as HTMLElement | null);
      if (!media) {
        window.alert('Выделите изображение или видео для выравнивания.');
        return;
      }
      media.style.maxWidth = '100%';
      if (mode === 'full') {
        media.style.display = 'block';
        media.style.width = '100%';
        media.style.height = media.style.height || 'auto';
        media.style.marginLeft = '0';
        media.style.marginRight = '0';
      } else {
        media.style.width = media.style.width || 'auto';
        media.style.display = 'block';
        if (mode === 'left') {
          media.style.marginLeft = '0';
          media.style.marginRight = 'auto';
        }
        if (mode === 'center') {
          media.style.marginLeft = 'auto';
          media.style.marginRight = 'auto';
        }
        if (mode === 'right') {
          media.style.marginLeft = 'auto';
          media.style.marginRight = '0';
        }
      }
      handleInput();
      if (media.tagName.toLowerCase() === 'img' || media.tagName.toLowerCase() === 'video') {
        setActiveMedia(media as HTMLElement);
        requestAnimationFrame(() => syncActiveMediaRect());
      }
    },
    [activeMedia, handleInput, syncActiveMediaRect]
  );

  const handleInsertTableSized = useCallback(
    (rows: number, cols: number) => {
      const safeRows = Math.max(1, Math.min(12, rows));
      const safeCols = Math.max(1, Math.min(12, cols));
      const cells = Array.from({ length: safeRows }, (_, r) => {
        const tds = Array.from({ length: safeCols }, (_, c) => {
          const label = r === 0 ? `Колонка ${c + 1}` : '';
          return `<td style="border:1px solid #d1d5db;padding:6px;">${label}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      insertHtml(`<table style="width:100%;border-collapse:collapse;margin:4px 0;"><tbody>${cells}</tbody></table><p></p>`);
      setTablePickerOpen(false);
    },
    [insertHtml]
  );

  const handleAddTableRow = useCallback(() => {
    const { table, row } = getCurrentTableContext();
    if (!table || !row) {
      window.alert('Установите курсор в ячейку таблицы.');
      return;
    }
    const cols = row.cells.length || 1;
    const newRow = table.insertRow(row.rowIndex + 1);
    for (let i = 0; i < cols; i += 1) {
      const cell = newRow.insertCell(i);
      cell.textContent = '';
    }
    normalizeTableStyle(table);
    handleInput();
  }, [getCurrentTableContext, normalizeTableStyle, handleInput]);

  const handleAddTableColumn = useCallback(() => {
    const { table, cell } = getCurrentTableContext();
    if (!table || !cell) {
      window.alert('Установите курсор в ячейку таблицы.');
      return;
    }
    const colIndex = cell.cellIndex;
    Array.from(table.rows).forEach((row) => {
      const newCell = row.insertCell(colIndex + 1);
      newCell.textContent = '';
    });
    normalizeTableStyle(table);
    handleInput();
  }, [getCurrentTableContext, normalizeTableStyle, handleInput]);

  const handleDeleteTableRow = useCallback(() => {
    const { table, row } = getCurrentTableContext();
    if (!table || !row) {
      window.alert('Установите курсор в ячейку таблицы.');
      return;
    }
    row.remove();
    handleInput();
  }, [getCurrentTableContext, handleInput]);

  const handleDeleteTableColumn = useCallback(() => {
    const { table, cell } = getCurrentTableContext();
    if (!table || !cell) {
      window.alert('Установите курсор в ячейку таблицы.');
      return;
    }
    const index = cell.cellIndex;
    Array.from(table.rows).forEach((row) => {
      if (row.cells[index]) {
        row.deleteCell(index);
      }
    });
    handleInput();
  }, [getCurrentTableContext, handleInput]);

  const syncActiveTableRect = useCallback(() => {
    if (!wrapperRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode as Node | null;
    const el = node instanceof HTMLElement ? node : node?.parentElement || null;
    const table = el?.closest?.('table') as HTMLTableElement | null;
    if (!table) {
      setActiveTableRect(null);
      return;
    }
    const wRect = wrapperRef.current.getBoundingClientRect();
    const tRect = table.getBoundingClientRect();
    setActiveTableRect({
      left: tRect.left - wRect.left + 8,
      top: tRect.top - wRect.top + 8,
    });
  }, []);

  useEffect(() => {
    syncActiveMediaRect();
  }, [syncActiveMediaRect, value]);

  useEffect(() => {
    const onResize = () => {
      syncActiveMediaRect();
      syncActiveTableRect();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncActiveMediaRect, syncActiveTableRect]);

  const clearActiveMedia = useCallback(() => {
    setActiveMedia(null);
    setActiveMediaRect(null);
  }, []);

  const onEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      
      // 🔧 Обработка кнопки удаления кода
      const deleteBtn = target?.closest?.('[data-delete-code="true"]') as HTMLElement | null;
      if (deleteBtn) {
        const codeBlock = target?.closest?.('[data-code-block="true"]') as HTMLElement | null;
        if (codeBlock) {
          handleDeleteCode(codeBlock);
        }
        return;
      }
      
      // 🔧 Обработка кнопки копирования кода
      const copyBtn = target?.closest?.('[data-copy-code="true"]') as HTMLElement | null;
      if (copyBtn) {
        const codeBlock = target?.closest?.('[data-code-block="true"]') as HTMLElement | null;
        if (codeBlock) {
          handleCopyCode(codeBlock);
        }
        return;
      }
      
      // Обработка кнопки редактирования кода
      const editBtn = target?.closest?.('[data-edit-code="true"]') as HTMLElement | null;
      if (editBtn) {
        const codeBlock = target?.closest?.('[data-code-block="true"]') as HTMLElement | null;
        if (codeBlock) {
          const blockId = codeBlock.getAttribute('data-code-id');
          const { code, language } = extractCodeFromBlock(codeBlock);
          setEditingCodeBlockId(blockId);
          setInitialCodeContent(code);
          setInitialLanguageContent(language);
          setCodeModalOpen(true);
        }
        return;
      }
      
      const media =
        (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO') ? target : null) as HTMLElement | null
        || (target?.closest?.('img,video') as HTMLElement | null);
      if (media && editorRef.current?.contains(media)) {
        setActiveMedia(media);
        setTableActionsOpen(false);
        requestAnimationFrame(() => {
          syncActiveMediaRect();
        });
        return;
      }
      clearActiveMedia();
      if (!target?.closest?.('[data-table-actions]')) {
        setTableActionsOpen(false);
      }
    },
    [clearActiveMedia, syncActiveMediaRect, extractCodeFromBlock, handleCopyCode, handleDeleteCode]
  );

  const resizeHandles = useMemo(
    () => [
      { id: 'nw', style: { left: -6, top: -6, cursor: 'nwse-resize' as const } },
      { id: 'n', style: { left: '50%', top: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' as const } },
      { id: 'ne', style: { right: -6, top: -6, cursor: 'nesw-resize' as const } },
      { id: 'e', style: { right: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' as const } },
      { id: 'se', style: { right: -6, bottom: -6, cursor: 'nwse-resize' as const } },
      { id: 's', style: { left: '50%', bottom: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' as const } },
      { id: 'sw', style: { left: -6, bottom: -6, cursor: 'nesw-resize' as const } },
      { id: 'w', style: { left: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' as const } },
    ],
    []
  );

  const beginResize = useCallback(
    (handle: string, e: React.PointerEvent) => {
      if (!activeMedia) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = activeMedia.getBoundingClientRect();
      resizeSessionRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [activeMedia]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeMedia) return;
      const session = resizeSessionRef.current;
      if (!session) return;
      e.preventDefault();
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      const min = 40;
      let nextW = session.startW;
      let nextH = session.startH;
      const h = session.handle;
      if (h.includes('e')) nextW = session.startW + dx;
      if (h.includes('w')) nextW = session.startW - dx;
      if (h.includes('s')) nextH = session.startH + dy;
      if (h.includes('n')) nextH = session.startH - dy;
      nextW = Math.max(min, nextW);
      nextH = Math.max(min, nextH);
      activeMedia.style.maxWidth = '100%';
      activeMedia.style.width = `${Math.round(nextW)}px`;
      activeMedia.style.height = `${Math.round(nextH)}px`;
      syncActiveMediaRect();
    },
    [activeMedia, syncActiveMediaRect]
  );

  const handleDeleteActiveMedia = useCallback(() => {
    if (!activeMedia) return;
    activeMedia.remove();
    clearActiveMedia();
    handleInput();
  }, [activeMedia, clearActiveMedia, handleInput]);

  const endResize = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeSessionRef.current) return;
      e.preventDefault();
      resizeSessionRef.current = null;
      handleInput();
    },
    [handleInput]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      execCommand('insertLineBreak');
    }
  }, [execCommand]);

  const savedRangeRef = useRef<Range | null>(null);
  const [ctxMenuOnEmpty, setCtxMenuOnEmpty] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    const sel = window.getSelection();
    savedRangeRef.current =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    const target = e.target as HTMLElement;
    const media = target.closest?.('img,video') as HTMLElement | null;
    if (media && editorRef.current?.contains(media)) {
      setActiveMedia(media);
      requestAnimationFrame(() => {
        syncActiveMediaRect();
      });
    }
    const targetText = (target.innerText ?? target.textContent ?? '').trim();
    const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;
    setCtxMenuOnEmpty(!hasSelection && (!targetText || target === editorRef.current));
  }, [disabled, syncActiveMediaRect]);

  const restoreSelectionForCmd = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch { /* ignore stale range */ }
    }
  }, []);

  const ctxCut = useCallback(() => {
    restoreSelectionForCmd();
    document.execCommand('cut');
    handleInput();
  }, [restoreSelectionForCmd, handleInput]);

  const ctxCopy = useCallback(() => {
    restoreSelectionForCmd();
    document.execCommand('copy');
  }, [restoreSelectionForCmd]);

  const ctxPaste = useCallback(async () => {
    restoreSelectionForCmd();
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand('insertText', false, text);
    } catch {
      document.execCommand('paste');
    }
    handleInput();
  }, [restoreSelectionForCmd, handleInput]);

  const ctxDelete = useCallback(() => {
    if (activeMedia && editorRef.current?.contains(activeMedia)) {
      handleDeleteActiveMedia();
      return;
    }
    restoreSelectionForCmd();
    document.execCommand('delete');
    handleInput();
  }, [activeMedia, handleDeleteActiveMedia, restoreSelectionForCmd, handleInput]);

  const ctxAlignLeft = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('justifyLeft');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxAlignCenter = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('justifyCenter');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxAlignRight = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('justifyRight');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxBold = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('bold');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxItalic = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('italic');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxUnderline = useCallback(() => {
    restoreSelectionForCmd();
    execCommand('underline');
  }, [restoreSelectionForCmd, execCommand]);

  const ctxH1 = useCallback(() => {
    restoreSelectionForCmd();
    document.execCommand('formatBlock', false, 'h1');
    handleInput();
  }, [restoreSelectionForCmd, handleInput]);

  const ctxH2 = useCallback(() => {
    restoreSelectionForCmd();
    document.execCommand('formatBlock', false, 'h2');
    handleInput();
  }, [restoreSelectionForCmd, handleInput]);

  const ctxInsertTable = useCallback(() => {
    restoreSelectionForCmd();
    handleInsertTableSized(3, 3);
  }, [restoreSelectionForCmd, handleInsertTableSized]);

  // 🔧 Показ/скрытие кнопки редактирования при наведении на блок кода
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const codeBlock = target.closest('[data-code-block="true"]') as HTMLElement | null;
      if (codeBlock) {
        const btnWrapper = codeBlock.querySelector('.code-edit-btn-wrapper') as HTMLElement | null;
        if (btnWrapper) {
          btnWrapper.style.opacity = '1';
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const codeBlock = target.closest('[data-code-block="true"]') as HTMLElement | null;
      if (codeBlock) {
        const btnWrapper = codeBlock.querySelector('.code-edit-btn-wrapper') as HTMLElement | null;
        if (btnWrapper) {
          btnWrapper.style.opacity = '0';
        }
      }
    };

    editor.addEventListener('mouseover', handleMouseOver);
    editor.addEventListener('mouseout', handleMouseOut);

    return () => {
      editor.removeEventListener('mouseover', handleMouseOver);
      editor.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <div className={`rich-text-editor ${className}`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* 🔧 Стили для кастомного скроллбара */}
      <style>{`
        .code-block::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .code-block::-webkit-scrollbar-track {
          background: #2d2d2d;
          border-radius: 2px;
        }
        .code-block::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 2px;
        }
        .code-block::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
        .code-block {
          scrollbar-width: thin;
          scrollbar-color: #555 #2d2d2d;
        }
        .code-block pre,
        .code-block code {
          min-width: 0;
          max-width: 100%;
        }
      `}</style>

      <CodeEditorModal
        isOpen={codeModalOpen}
        codeBlockId={editingCodeBlockId}
        initialCode={initialCodeContent}
        initialLanguage={initialLanguageContent}
        onSave={handleSaveCode}
        onClose={() => setCodeModalOpen(false)}
      />

      {/* Toolbar */}
      <div className="border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-1.5 flex flex-wrap gap-0.5">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Жирный"
          disabled={disabled}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Курсив"
          disabled={disabled}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Подчеркнутый"
          disabled={disabled}
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => setHeading('h2')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Заголовок 2"
          disabled={disabled}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setHeading('h3')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Заголовок 3"
          disabled={disabled}
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => (onUploadImage ? imageInputRef.current?.click() : handleInsertImageByUrl())}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить изображение"
          disabled={disabled}
        >
          <Image className="w-4 h-4" />
        </button>
        {onUploadImage && (
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInsertImageFile}
            disabled={disabled}
          />
        )}
        <button
          type="button"
          onClick={handleInsertVideo}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить видео по ссылке"
          disabled={disabled}
        >
          <Video className="w-4 h-4" />
        </button>
        {onUploadVideo && (
          <>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
              className="hidden"
              onChange={handleInsertVideoFile}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
              title="Загрузить видеофайл"
              disabled={disabled}
            >
              Видео
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => handleAlignMedia('left')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа слева"
          disabled={disabled}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('center')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа по центру"
          disabled={disabled}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('right')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа справа"
          disabled={disabled}
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('full')}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа на всю ширину"
          disabled={disabled}
        >
          <Columns3 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          type="button"
          onClick={handleInsertCode}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить код"
          disabled={disabled}
        >
          <CodeIcon className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => setTablePickerOpen((v) => !v)}
          className="p-1 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить таблицу"
          disabled={disabled}
        >
          <Table2 className="w-4 h-4" />
        </button>
        {tablePickerOpen && (
          <div className="relative">
            <div
              className="absolute top-8 left-0 z-50 w-[200px] rounded-md border bg-white shadow-md p-2"
              onMouseLeave={() => setTablePickerOpen(false)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-medium text-gray-700">
                  {tablePickerHover.rows}×{tablePickerHover.cols}
                </div>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => setTablePickerOpen(false)}
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {Array.from({ length: 8 * 8 }).map((_, idx) => {
                  const r = Math.floor(idx / 8) + 1;
                  const c = (idx % 8) + 1;
                  const active = r <= tablePickerHover.rows && c <= tablePickerHover.cols;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      className={`h-4 w-4 rounded border cursor-pointer ${active ? 'bg-[#efe9ff] border-[#8f6bf4]' : 'bg-white'}`}
                      onMouseEnter={() => setTablePickerHover({ rows: r, cols: c })}
                      onClick={() => handleInsertTableSized(r, c)}
                      aria-label={`Таблица ${r} на ${c}`}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Маркированный список"
          disabled={disabled}
        >
          • список
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="Нумерованный список"
          disabled={disabled}
        >
          1. список
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По левому краю"
          disabled={disabled}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По центру"
          disabled={disabled}
        >
          ↔
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200 cursor-pointer"
          title="По правому краю"
          disabled={disabled}
        >
          →
        </button>
      </div>

      {/* Editor */}
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={disabled}>
          <div className="relative">
            {isEmpty && !disabled && (
              <div className="absolute top-2.5 left-2.5 text-sm text-gray-400 pointer-events-none z-10">
                {placeholder}
              </div>
            )}
            <div ref={wrapperRef} className="relative" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
              <div
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                onContextMenu={handleContextMenu}
                onInput={() => {
                  handleInput();
                  syncActiveTableRect();
                }}
                onClick={onEditorClick}
                onKeyDown={(e) => {
                  handleKeyDown(e);
                  requestAnimationFrame(() => syncActiveTableRect());
                }}
                onMouseUp={() => {
                  requestAnimationFrame(() => syncActiveTableRect());
                }}
                className={`
                  min-h-[150px] p-2.5 border border-gray-300 border-t-0 rounded-b-md
                  focus:outline-none focus:ring-2 focus:ring-purple-500
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

              {activeMediaRect && !disabled && (
                <div
                  className="absolute z-40"
                  style={{
                    left: activeMediaRect.left,
                    top: activeMediaRect.top,
                    width: activeMediaRect.width,
                    height: activeMediaRect.height,
                    border: '2px solid #8f6bf4',
                    borderRadius: 6,
                    pointerEvents: 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDeleteActiveMedia}
                    className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#8f6bf4] bg-white text-[#8f6bf4] shadow-sm"
                    style={{ pointerEvents: 'auto' }}
                    aria-label="Удалить медиа"
                    title="Удалить медиа"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {resizeHandles.map((h) => (
                    <div
                      key={h.id}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(e) => beginResize(h.id, e)}
                      onPointerMove={onResizeMove}
                      onPointerUp={endResize}
                      onPointerCancel={endResize}
                      style={{
                        position: 'absolute',
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: '#efe9ff',
                        border: '2px solid #8f6bf4',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        pointerEvents: 'auto',
                        ...h.style,
                      }}
                    />
                  ))}
                </div>
              )}

              {activeTableRect && !disabled && (
                <div
                  className="absolute z-40"
                  style={{ left: activeTableRect.left, top: activeTableRect.top }}
                  data-table-actions
                >
                  <button
                    type="button"
                    onClick={() => setTableActionsOpen((v) => !v)}
                    className="h-6 w-6 rounded-full bg-[#efe9ff] hover:bg-[#e1d5ff] text-[#8f6bf4] cursor-pointer inline-flex items-center justify-center border border-[#d7c8ff] shadow-sm"
                    title="Таблица — действия"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {tableActionsOpen && (
                    <div className="mt-1 w-48 rounded-md border bg-white shadow-md p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTableRow();
                          setTableActionsOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        + Строку
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTableColumn();
                          setTableActionsOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        + Столбец
                      </button>
                      <div className="h-px bg-gray-200 my-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteTableRow();
                          setTableActionsOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        − Строку
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteTableColumn();
                          setTableActionsOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        − Столбец
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52">
          <ContextMenuItem onSelect={ctxCut} className="flex items-center gap-2">
            <Scissors className="h-4 w-4 shrink-0" />
            Вырезать
            <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={ctxCopy} className="flex items-center gap-2">
            <Copy className="h-4 w-4 shrink-0" />
            Копировать
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={ctxPaste} className="flex items-center gap-2">
            <Clipboard className="h-4 w-4 shrink-0" />
            Вставить
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={ctxDelete}
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Удалить
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onSelect={ctxAlignLeft} className="flex items-center gap-2">
            <AlignLeft className="h-4 w-4 shrink-0" />
            Слева
          </ContextMenuItem>
          <ContextMenuItem onSelect={ctxAlignCenter} className="flex items-center gap-2">
            <AlignCenter className="h-4 w-4 shrink-0" />
            По центру
          </ContextMenuItem>
          <ContextMenuItem onSelect={ctxAlignRight} className="flex items-center gap-2">
            <AlignRight className="h-4 w-4 shrink-0" />
            Справа
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <Type className="h-4 w-4 shrink-0" />
              Форматировать
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem onSelect={ctxBold} className="flex items-center gap-2">
                <Bold className="h-4 w-4 shrink-0" />
                Жирный
                <ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onSelect={ctxItalic} className="flex items-center gap-2">
                <Italic className="h-4 w-4 shrink-0" />
                Курсив
                <ContextMenuShortcut>Ctrl+I</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onSelect={ctxUnderline} className="flex items-center gap-2">
                <Underline className="h-4 w-4 shrink-0" />
                Подчеркивание
                <ContextMenuShortcut>Ctrl+U</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={ctxH1} className="flex items-center gap-2">
                <Heading1 className="h-4 w-4 shrink-0" />
                Заголовок H1
              </ContextMenuItem>
              <ContextMenuItem onSelect={ctxH2} className="flex items-center gap-2">
                <Heading2 className="h-4 w-4 shrink-0" />
                Заголовок H2
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {ctxMenuOnEmpty && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={ctxInsertTable} className="flex items-center gap-2">
                <Table2 className="h-4 w-4 shrink-0" />
                Вставить таблицу
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default RichTextEditor;