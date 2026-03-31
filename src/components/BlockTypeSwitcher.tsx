import { Type, AlignLeft } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type BlockType = Database['public']['Enums']['block_type'];

interface Props {
  currentType: BlockType;
  onSwitch: (type: BlockType) => void;
}

export default function BlockTypeSwitcher({ currentType, onSwitch }: Props) {
  if (currentType === 'image') return null;

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onSwitch('heading')}
        className={`p-1 rounded transition-colors ${
          currentType === 'heading'
            ? 'text-foreground bg-muted'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        title="Heading"
      >
        <Type className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onSwitch('text')}
        className={`p-1 rounded transition-colors ${
          currentType === 'text'
            ? 'text-foreground bg-muted'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        title="Text"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
