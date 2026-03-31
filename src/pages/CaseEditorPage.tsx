import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ImageUpload';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, Type, AlignLeft, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;

function BlockInserter({ onAdd }: { onAdd: (type: Block['type']) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-center h-0 group/inserter">
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

export default function CaseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from('cases').select('*').eq('id', id).single(),
      supabase.from('blocks').select('*').eq('case_id', id).order('sort_order'),
    ]).then(([caseRes, blocksRes]) => {
      if (caseRes.data) setCaseData(caseRes.data);
      if (blocksRes.data) setBlocks(blocksRes.data);
      setLoading(false);
    });
  }, [id, user]);

  const saveCase = async (updates: Partial<Case>) => {
    if (!id) return;
    const { error } = await supabase.from('cases').update(updates).eq('id', id);
    if (error) toast.error('Failed to save');
    else setCaseData((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    setSaving(true);
    try {
      const url = await uploadImage(file, user.id, 'covers');
      await saveCase({ cover_image_url: url });
      toast.success('Cover uploaded');
    } catch {
      toast.error('Upload failed');
    }
    setSaving(false);
  };

  const insertBlockAt = async (type: Block['type'], afterIndex: number) => {
    if (!id) return;
    const newOrder = afterIndex + 1;
    // Shift blocks after insertion point
    const shifted = blocks.map((b, i) =>
      i >= newOrder ? { ...b, sort_order: b.sort_order + 1 } : b
    );
    const { data, error } = await supabase
      .from('blocks')
      .insert({ case_id: id, type, sort_order: newOrder })
      .select()
      .single();
    if (error) { toast.error('Failed to add block'); return; }
    if (data) {
      const updated = [...shifted.slice(0, newOrder), data, ...shifted.slice(newOrder)];
      setBlocks(updated.map((b, i) => ({ ...b, sort_order: i })));
      // Update sort orders in DB
      for (const b of shifted.filter((_, i) => i >= newOrder)) {
        await supabase.from('blocks').update({ sort_order: b.sort_order }).eq('id', b.id);
      }
    }
  };

  const addBlock = async (type: Block['type']) => {
    if (!id) return;
    const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : -1;
    const { data, error } = await supabase
      .from('blocks')
      .insert({ case_id: id, type, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) toast.error('Failed to add block');
    else if (data) setBlocks((prev) => [...prev, data]);
  };

  const updateBlock = async (blockId: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content } : b)));
    await supabase.from('blocks').update({ content }).eq('id', blockId);
  };

  const deleteBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    await supabase.from('blocks').delete().eq('id', blockId);
  };

  const moveBlock = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const reordered = updated.map((b, i) => ({ ...b, sort_order: i }));
    setBlocks(reordered);
    for (const b of reordered) {
      await supabase.from('blocks').update({ sort_order: b.sort_order }).eq('id', b.id);
    }
  };

  const handleBlockImageUpload = async (blockId: string, file: File) => {
    if (!user) return;
    try {
      const url = await uploadImage(file, user.id, 'blocks');
      updateBlock(blockId, url);
    } catch {
      toast.error('Upload failed');
    }
  };

  const togglePublish = async () => {
    if (!caseData) return;
    const newStatus = caseData.status === 'published' ? 'draft' : 'published';
    await saveCase({ status: newStatus });
    toast.success(newStatus === 'published' ? 'Published!' : 'Unpublished');
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  if (loading) return <div className="text-sm text-muted-foreground p-8">Loading…</div>;
  if (!caseData) return <div className="text-sm text-muted-foreground p-8">Not found</div>;

  return (
    <div className="max-w-[740px] mx-auto pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Button
          onClick={togglePublish}
          variant={caseData.status === 'published' ? 'outline' : 'default'}
          size="sm"
        >
          {caseData.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      {/* Title */}
      <textarea
        ref={titleRef}
        value={caseData.title}
        onChange={(e) => {
          setCaseData((prev) => prev ? { ...prev, title: e.target.value } : prev);
          autoResizeTextarea(e.target);
        }}
        onBlur={() => saveCase({ title: caseData.title })}
        placeholder="Untitled"
        rows={1}
        className="w-full text-[2rem] md:text-[2.5rem] font-bold leading-tight bg-transparent border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground/50 mb-6"
        onFocus={(e) => autoResizeTextarea(e.target)}
      />

      {/* Cover image */}
      <div className="mb-10">
        {caseData.cover_image_url ? (
          <div className="relative group/cover">
            <img src={caseData.cover_image_url} alt="" className="w-full rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-lg">
              <ImageUpload
                onUpload={handleCoverUpload}
                loading={saving}
                className="w-full h-full"
              />
            </div>
          </div>
        ) : (
          <ImageUpload
            onUpload={handleCoverUpload}
            loading={saving}
            className="aspect-[16/9] border border-dashed border-border rounded-lg"
          />
        )}
      </div>

      {/* Blocks */}
      <div className="space-y-0">
        {blocks.map((block, index) => (
          <div key={block.id}>
            {/* Inserter above each block */}
            <div className="py-2">
              <BlockInserter onAdd={(type) => insertBlockAt(type, index - 1)} />
            </div>

            {/* Block */}
            <div className="group/block relative pl-10">
              {/* Left controls */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => deleteBlock(block.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              {block.type === 'heading' && (
                <textarea
                  value={block.content}
                  onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                  onFocus={(e) => autoResizeTextarea(e.target)}
                  placeholder="Heading"
                  rows={1}
                  className="w-full text-xl md:text-2xl font-semibold leading-snug bg-transparent border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground/40"
                />
              )}
              {block.type === 'text' && (
                <textarea
                  value={block.content}
                  onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                  onFocus={(e) => autoResizeTextarea(e.target)}
                  placeholder="Write something…"
                  rows={1}
                  className="w-full text-base leading-relaxed bg-transparent border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground/40"
                />
              )}
              {block.type === 'image' && (
                block.content ? (
                  <img src={block.content} alt="" className="w-full rounded-lg" />
                ) : (
                  <ImageUpload
                    onUpload={(file) => handleBlockImageUpload(block.id, file)}
                    className="aspect-[16/9] border border-dashed border-border rounded-lg"
                  />
                )
              )}
            </div>
          </div>
        ))}

        {/* Inserter after last block */}
        <div className="py-2">
          <BlockInserter onAdd={(type) => addBlock(type)} />
        </div>
      </div>

      {/* Bottom add buttons (always visible fallback) */}
      {blocks.length === 0 && (
        <div className="flex items-center gap-2 pt-4 text-muted-foreground">
          <Plus className="h-4 w-4" />
          <button onClick={() => addBlock('heading')} className="text-sm hover:text-foreground transition-colors">Heading</button>
          <span className="text-border">·</span>
          <button onClick={() => addBlock('text')} className="text-sm hover:text-foreground transition-colors">Text</button>
          <span className="text-border">·</span>
          <button onClick={() => addBlock('image')} className="text-sm hover:text-foreground transition-colors">Image</button>
        </div>
      )}
    </div>
  );
}
