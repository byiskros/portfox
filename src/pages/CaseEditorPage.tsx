import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ImageUpload';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, Type, AlignLeft, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;

export default function CaseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!caseData) return <div className="text-sm text-muted-foreground">Not found</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
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

      <div className="space-y-4">
        <div className="rounded-lg bg-secondary/50 p-4">
          <Input
            value={caseData.title}
            onChange={(e) => setCaseData((prev) => prev ? { ...prev, title: e.target.value } : prev)}
            onBlur={() => saveCase({ title: caseData.title })}
            placeholder="Project title"
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Cover image</p>
          <div className="rounded-lg bg-secondary/50 p-4">
            <ImageUpload
              onUpload={handleCoverUpload}
              loading={saving}
              preview={caseData.cover_image_url}
              className="aspect-[16/9]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Blocks</p>
        {blocks.map((block, index) => (
          <div key={block.id} className="group flex gap-2">
            <div className="flex flex-col gap-0.5 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-0.5 hover:bg-secondary rounded disabled:opacity-20">
                <ChevronUp className="h-3 w-3" />
              </button>
              <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-0.5 hover:bg-secondary rounded disabled:opacity-20">
                <ChevronDown className="h-3 w-3" />
              </button>
              <button onClick={() => deleteBlock(block.id)} className="p-0.5 hover:bg-secondary rounded text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 rounded-lg bg-secondary/50 p-4">
              {block.type === 'heading' && (
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value)}
                  placeholder="Heading"
                  className="font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                />
              )}
              {block.type === 'text' && (
                <Textarea
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value)}
                  placeholder="Write something…"
                  className="min-h-[80px] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none"
                />
              )}
              {block.type === 'image' && (
                block.content ? (
                  <img src={block.content} alt="" className="rounded-lg max-w-full" />
                ) : (
                  <ImageUpload
                    onUpload={(file) => handleBlockImageUpload(block.id, file)}
                    className="aspect-[16/9]"
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => addBlock('heading')} className="gap-1.5 text-xs">
          <Type className="h-3 w-3" /> Heading
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('text')} className="gap-1.5 text-xs">
          <AlignLeft className="h-3 w-3" /> Text
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('image')} className="gap-1.5 text-xs">
          <ImageIcon className="h-3 w-3" /> Image
        </Button>
      </div>
    </div>
  );
}
