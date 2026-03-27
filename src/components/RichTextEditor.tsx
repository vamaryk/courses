import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Video,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns3,
  Table2,
  Plus,
  X,
} from 'lucide-react';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSyncedValueRef = useRef<string>(value);
  const isEmpty = !value || value.replace(/<[^>]*>/g, '').trim().length === 0;

  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const [activeImageRect, setActiveImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
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
    table.style.margin = '12px 0';
    table.querySelectorAll('td,th').forEach((node) => {
      const cell = node as HTMLTableCellElement;
      cell.style.border = '1px solid #d1d5db';
      cell.style.padding = '8px';
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

  const syncActiveImageRect = useCallback(() => {
    if (!activeImage || !wrapperRef.current) return;
    const wRect = wrapperRef.current.getBoundingClientRect();
    const iRect = activeImage.getBoundingClientRect();
    setActiveImageRect({
      left: iRect.left - wRect.left,
      top: iRect.top - wRect.top,
      width: iRect.width,
      height: iRect.height,
    });
  }, [activeImage]);

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

  const handleAlignMedia = useCallback(
    (mode: 'left' | 'center' | 'right' | 'full') => {
      const selection = window.getSelection();
      const clickTarget = selection?.anchorNode instanceof HTMLElement ? selection.anchorNode : null;
      const media =
        (activeImage as HTMLElement | null) ||
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
      if (media.tagName.toLowerCase() === 'img') {
        setActiveImage(media as HTMLImageElement);
        requestAnimationFrame(() => syncActiveImageRect());
      }
    },
    [activeImage, handleInput, syncActiveImageRect]
  );

  const handleInsertTableSized = useCallback(
    (rows: number, cols: number) => {
      const safeRows = Math.max(1, Math.min(12, rows));
      const safeCols = Math.max(1, Math.min(12, cols));
      const cells = Array.from({ length: safeRows }, (_, r) => {
        const tds = Array.from({ length: safeCols }, (_, c) => {
          const label = r === 0 ? `Колонка ${c + 1}` : '';
          return `<td style="border:1px solid #d1d5db;padding:8px;">${label}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      insertHtml(`<table style="width:100%;border-collapse:collapse;margin:12px 0;"><tbody>${cells}</tbody></table><p></p>`);
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
    syncActiveImageRect();
  }, [syncActiveImageRect, value]);

  useEffect(() => {
    const onResize = () => {
      syncActiveImageRect();
      syncActiveTableRect();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncActiveImageRect, syncActiveTableRect]);

  const clearActiveMedia = useCallback(() => {
    setActiveImage(null);
    setActiveImageRect(null);
  }, []);

  const onEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const img = target && target.tagName === 'IMG' ? (target as HTMLImageElement) : (target?.closest?.('img') as HTMLImageElement | null);
      if (img && editorRef.current?.contains(img)) {
        setActiveImage(img);
        setTableActionsOpen(false);
        requestAnimationFrame(() => {
          syncActiveImageRect();
        });
        return;
      }
      // Clicking elsewhere closes image handles
      clearActiveMedia();
      // If clicked outside table actions, close it.
      if (!target?.closest?.('[data-table-actions]')) {
        setTableActionsOpen(false);
      }
    },
    [clearActiveMedia, syncActiveImageRect]
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
      if (!activeImage) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = activeImage.getBoundingClientRect();
      resizeSessionRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [activeImage]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeImage) return;
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

      activeImage.style.maxWidth = '100%';
      activeImage.style.width = `${Math.round(nextW)}px`;
      activeImage.style.height = `${Math.round(nextH)}px`;

      syncActiveImageRect();
    },
    [activeImage, syncActiveImageRect]
  );

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
        <button
          type="button"
          onClick={() => handleAlignMedia('left')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа слева"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('center')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа по центру"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('right')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа справа"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleAlignMedia('full')}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Медиа на всю ширину"
        >
          <Columns3 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => setTablePickerOpen((v) => !v)}
          className="p-1.5 border rounded hover:bg-gray-200 cursor-pointer"
          title="Вставить таблицу"
        >
          <Table2 className="w-4 h-4" />
        </button>
        {tablePickerOpen && (
          <div className="relative">
            <div
              className="absolute top-10 left-0 z-50 w-[240px] rounded-md border bg-white shadow-md p-3"
              onMouseLeave={() => setTablePickerOpen(false)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-700">
                  Таблица: {tablePickerHover.rows}×{tablePickerHover.cols}
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
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 8 * 8 }).map((_, idx) => {
                  const r = Math.floor(idx / 8) + 1;
                  const c = (idx % 8) + 1;
                  const active = r <= tablePickerHover.rows && c <= tablePickerHover.cols;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      className={`h-5 w-5 rounded border cursor-pointer ${active ? 'bg-[#efe9ff] border-[#8f6bf4]' : 'bg-white'}`}
                      onMouseEnter={() => setTablePickerHover({ rows: r, cols: c })}
                      onClick={() => handleInsertTableSized(r, c)}
                      aria-label={`Таблица ${r} на ${c}`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-gray-500">Выберите размер (до 8×8)</div>
            </div>
          </div>
        )}
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
        <div ref={wrapperRef} className="relative">
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={() => {
              handleInput();
              syncActiveTableRect();
            }}
            onClick={onEditorClick}
            onKeyDown={(e) => {
              handleKeyDown(e);
              // update table actions on navigation
              requestAnimationFrame(() => syncActiveTableRect());
            }}
            onMouseUp={() => {
              requestAnimationFrame(() => syncActiveTableRect());
            }}
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

          {/* Image resize overlay */}
          {activeImageRect && !disabled && (
            <div
              className="absolute z-40"
              style={{
                left: activeImageRect.left,
                top: activeImageRect.top,
                width: activeImageRect.width,
                height: activeImageRect.height,
                border: '2px solid #8f6bf4',
                borderRadius: 6,
                pointerEvents: 'none',
              }}
            >
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

          {/* Table action button (inside table) */}
          {activeTableRect && !disabled && (
            <div
              className="absolute z-40"
              style={{ left: activeTableRect.left, top: activeTableRect.top }}
              data-table-actions
            >
              <button
                type="button"
                onClick={() => setTableActionsOpen((v) => !v)}
                className="h-7 w-7 rounded-full bg-[#efe9ff] hover:bg-[#e1d5ff] text-[#8f6bf4] cursor-pointer inline-flex items-center justify-center border border-[#d7c8ff] shadow-sm"
                title="Таблица — действия"
              >
                <Plus className="w-4 h-4" />
              </button>
              {tableActionsOpen && (
                <div className="mt-2 w-56 rounded-md border bg-white shadow-md p-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddTableRow();
                      setTableActionsOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    + Строку ниже
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddTableColumn();
                      setTableActionsOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    + Столбец справа
                  </button>
                  <div className="h-px bg-gray-200 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTableRow();
                      setTableActionsOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    − Удалить строку
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTableColumn();
                      setTableActionsOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    − Удалить столбец
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;