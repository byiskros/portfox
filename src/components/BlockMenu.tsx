import { useState, useRef, useEffect } from 'react';
import { GripVertical, Type, AlignLeft, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type BlockType = Database['public']['Enums']['block_type'];

interface Props {
  currentType: BlockType;
  onSwitchType: (type: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function BlockMenu({
  currentType,
  onSwitchType,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-grab"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] bg-popover border border-border rounded-lg shadow-md py-1">
          {currentType !== 'image' && (
            <>
              <button
                onClick={() => { onSwitchType('heading'); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  currentType === 'heading' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Type className="h-3.5 w-3.5" /> Заголовок
              </button>
              <button
                onClick={() => { onSwitchType('text'); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  currentType === 'text' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" /> Текст
              </button>
              <div className="h-px bg-border my-1" />
            </>
          )}
          <button
            onClick={() => { onMoveUp(); setOpen(false); }}
            disabled={!canMoveUp}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" /> Вверх
          </button>
          <button
            onClick={() => { onMoveDown(); setOpen(false); }}
            disabled={!canMoveDown}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" /> Вниз
          </button>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}
