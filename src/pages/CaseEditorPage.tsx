import { useEffect, useState, useRef, useCallback, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Switch } from '@/components/ui/switch';
import ImageUpload from '@/components/ImageUpload';
import BlockInserter from '@/components/BlockInserter';
import BlockMenu from '@/components/BlockMenu';
import { ArrowLeft, Plus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;
type BlockType = Database['public']['Enums']['block_type'];

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function CaseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
      // Auto-resize all textareas after data loads
      setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.style.height = 'auto';
          titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
        blockRefs.current.forEach((el) => {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        });
      }, 0);
    });
  }, [id, user]);

  const showSaved = useCallback(() => {
    setSaveStatus('saved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }, []);

  const saveCase = async (updates: Partial<Case>) => {
    if (!id) return;
    setSaveStatus('saving');
    const { error } = await supabase.from('cases').update(updates).eq('id', id);
    if (error) { toast.error('Failed to save'); setSaveStatus('idle'); }
    else { setCaseData((prev) => prev ? { ...prev, ...updates } : prev); showSaved(); }
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
    setSaveStatus('saving');
    const { error } = await supabase.from('blocks').update({ content }).eq('id', blockId);
    if (error) { toast.error('Failed to save'); setSaveStatus('idle'); }
    else showSaved();
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, _block: Block, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertBlockAt('text', index);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</div>;
  if (!caseData) return <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Not found</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-[740px] mx-auto px-4 flex items-center justify-between h-12">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-4">
            {/* Save status */}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
              {saveStatus === 'saved' && <><Check className="h-3 w-3" /> Saved</>}
            </span>

            {/* Publish toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground">
                {caseData.status === 'published' ? 'Published' : 'Draft'}
              </span>
              <Switch
                checked={caseData.status === 'published'}
                onCheckedChange={togglePublish}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[740px] mx-auto px-4 pt-12 pb-32">
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
          className="w-full text-[2rem] md:text-[2.25rem] font-bold leading-[1.2] bg-transparent border-0 outline-none resize-none overflow-hidden text-foreground placeholder:text-muted-foreground/30 mb-3"
          onFocus={(e) => autoResizeTextarea(e.target)}
        />

        {/* Description */}
        <textarea
          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
          value={(caseData as any).description || ''}
          onChange={(e) => {
            setCaseData((prev) => prev ? { ...prev, description: e.target.value } as any : prev);
            autoResizeTextarea(e.target);
          }}
          onBlur={() => saveCase({ description: (caseData as any).description || '' } as any)}
          placeholder="Short description…"
          rows={1}
          className="w-full text-lg leading-[1.6] bg-transparent border-0 outline-none resize-none overflow-hidden text-muted-foreground placeholder:text-muted-foreground/30 mb-10"
          onFocus={(e) => autoResizeTextarea(e.target)}
        />

        {/* Cover image */}
        <div className="mb-12">
          {caseData.cover_image_url ? (
            <div className="relative group/cover">
              <img src={caseData.cover_image_url} alt="" className="w-full rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-lg">
                <ImageUpload onUpload={handleCoverUpload} loading={saving} className="w-full h-full" />
              </div>
            </div>
          ) : (
            <ImageUpload onUpload={handleCoverUpload} loading={saving} className="aspect-[16/9] border border-dashed border-border rounded-lg hover:border-muted-foreground/40 transition-colors" />
          )}
        </div>

        {/* Blocks */}
        <div>
          <BlockInserter onAdd={(type) => insertBlockAt(type, -1)} />

          {blocks.map((block, index) => (
            <div key={block.id}>
              {/* Block row */}
              <div className="group/block relative -ml-8 pl-8">
                {/* Grip handle — left side, on hover */}
                <div className="absolute left-0 top-0 opacity-0 group-hover/block:opacity-100 transition-opacity">
                  <BlockMenu
                    currentType={block.type}
                    onSwitchType={(t) => switchBlockType(block.id, t)}
                    onMoveUp={() => moveBlock(index, -1)}
                    onMoveDown={() => moveBlock(index, 1)}
                    onDelete={() => deleteBlock(block.id)}
                    canMoveUp={index > 0}
                    canMoveDown={index < blocks.length - 1}
                  />
                </div>

                {/* Content */}
                {block.type === 'heading' && (
                  <textarea
                    ref={(el) => { if (el) { blockRefs.current.set(block.id, el); el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    value={block.content}
                    onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                    onFocus={(e) => autoResizeTextarea(e.target)}
                    onKeyDown={(e) => handleKeyDown(e, block, index)}
                    placeholder="Heading"
                    rows={1}
                    className="w-full text-xl md:text-2xl font-semibold leading-[1.3] bg-transparent border-0 outline-none resize-none overflow-hidden text-foreground placeholder:text-muted-foreground/30 py-1"
                  />
                )}
                {block.type === 'text' && (
                  <textarea
                    ref={(el) => { if (el) { blockRefs.current.set(block.id, el); el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    value={block.content}
                    onChange={(e) => { updateBlock(block.id, e.target.value); autoResizeTextarea(e.target); }}
                    onFocus={(e) => autoResizeTextarea(e.target)}
                    onKeyDown={(e) => handleKeyDown(e, block, index)}
                    placeholder="Write something…"
                    rows={1}
                    className="w-full text-lg leading-[1.8] bg-transparent border-0 outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/30 py-1"
                  />
                )}
                {block.type === 'image' && (
                  block.content ? (
                    <img src={block.content} alt="" className="w-full rounded-xl shadow-sm" />
                  ) : (
                    <ImageUpload
                      onUpload={(file) => handleBlockImageUpload(block.id, file)}
                      className="aspect-[16/9] border border-dashed border-border rounded-lg hover:border-muted-foreground/40 transition-colors"
                    />
                  )
                )}
              </div>

              <BlockInserter onAdd={(type) => insertBlockAt(type, index)} />
            </div>
          ))}

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
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
    </div>
  );
}
