import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ImageUpload';
import BlockInserter from '@/components/BlockInserter';
import BlockTypeSwitcher from '@/components/BlockTypeSwitcher';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;
type BlockType = Database['public']['Enums']['block_type'];

export default function CaseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const blockRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

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

  const insertBlockAt = async (type: BlockType, afterIndex: number) => {
    if (!id) return;
    const newOrder = afterIndex + 1;
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
      for (const b of shifted.filter((_, i) => i >= newOrder)) {
        await supabase.from('blocks').update({ sort_order: b.sort_order }).eq('id', b.id);
      }
      // Focus new block
      setTimeout(() => {
        const el = blockRefs.current.get(data.id);
        el?.focus();
      }, 50);
    }
  };

  const addBlock = async (type: BlockType) => {
    if (!id) return;
    const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : -1;
    const { data, error } = await supabase
      .from('blocks')
      .insert({ case_id: id, type, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) toast.error('Failed to add block');
    else if (data) {
      setBlocks((prev) => [...prev, data]);
      setTimeout(() => {
        const el = blockRefs.current.get(data.id);
        el?.focus();
      }, 50);
    }
  };

  const updateBlock = async (blockId: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content } : b)));
    await supabase.from('blocks').update({ content }).eq('id', blockId);
  };

  const switchBlockType = async (blockId: string, newType: BlockType) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, type: newType } : b)));
    await supabase.from('blocks').update({ type: newType }).eq('id', blockId);
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, block: Block, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertBlockAt('text', index);
    }
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
              <ImageUpload onUpload={handleCoverUpload} loading={saving} className="w-full h-full" />
            </div>
          </div>
        ) : (
          <ImageUpload onUpload={handleCoverUpload} loading={saving} className="aspect-[16/9] border border-dashed border-border rounded-lg" />
        )}
      </div>

      {/* Blocks */}
      <div>
        {/* Inserter before first block */}
        <BlockInserter onAdd={(type) => insertBlockAt(type, -1)} />

        {blocks.map((block, index) => (
          <div key={block.id}>
            {/* Block */}
            <div className="group/block relative">
              {/* Right controls — horizontal row, vertically centered */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-70 group-hover/block:opacity-100 transition-opacity">
                <BlockTypeSwitcher currentType={block.type} onSwitch={(t) => switchBlockType(block.id, t)} />
                <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronUp className="h-[18px] w-[18px]" />
                </button>
                <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-[18px] w-[18px]" />
                </button>
                <button onClick={() => deleteBlock(block.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              {block.type === 'heading' && (
                <textarea
                  ref={(el) => { if (el) blockRefs.current.set(block.id, el); }}
                  value={block.content}
                  onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                  onFocus={(e) => autoResizeTextarea(e.target)}
                  onKeyDown={(e) => handleKeyDown(e, block, index)}
                  placeholder="Heading"
                  rows={1}
                  className="w-full text-xl md:text-2xl font-semibold leading-snug bg-transparent border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground/40"
                />
              )}
              {block.type === 'text' && (
                <textarea
                  ref={(el) => { if (el) blockRefs.current.set(block.id, el); }}
                  value={block.content}
                  onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                  onFocus={(e) => autoResizeTextarea(e.target)}
                  onKeyDown={(e) => handleKeyDown(e, block, index)}
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

            {/* Inserter after each block */}
            <BlockInserter onAdd={(type) => insertBlockAt(type, index)} />
          </div>
        ))}

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Plus className="h-4 w-4" />
            <button onClick={() => addBlock('heading')} className="text-sm hover:text-foreground transition-colors">Heading</button>
            <span className="text-border">·</span>
            <button onClick={() => addBlock('text')} className="text-sm hover:text-foreground transition-colors">Text</button>
            <span className="text-border">·</span>
            <button onClick={() => addBlock('image')} className="text-sm hover:text-foreground transition-colors">Image</button>
          </div>
        )}
      </div>
    </div>
  );
}
