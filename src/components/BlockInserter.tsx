import { useState } from 'react';
import { Plus, Type, AlignLeft, ImageIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type BlockType = Database['public']['Enums']['block_type'];

export default function BlockInserter({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-center h-6 group/inserter">
      {/* Hover line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-transparent group-hover/inserter:bg-border transition-colors" />

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute z-10 p-1 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all opacity-0 group-hover/inserter:opacity-100 scale-90 group-hover/inserter:scale-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute z-10 flex items-center gap-1 bg-background border border-border rounded-lg px-1 py-1 shadow-sm">
          <button onClick={() => { onAdd('heading'); setOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Type className="h-3.5 w-3.5" /> Heading
          </button>
          <button onClick={() => { onAdd('text'); setOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <AlignLeft className="h-3.5 w-3.5" /> Text
          </button>
          <button onClick={() => { onAdd('image'); setOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <ImageIcon className="h-3.5 w-3.5" /> Image
          </button>
        </div>
      )}
    </div>
  );
}
