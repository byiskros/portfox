import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ResumePage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContent(data.content);
          setExists(true);
        }
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    if (exists) {
      const { error } = await supabase.from('resumes').update({ content }).eq('user_id', user.id);
      if (error) toast.error('Failed to save');
      else toast.success('Saved');
    } else {
      const { error } = await supabase.from('resumes').insert({ user_id: user.id, content });
      if (error) toast.error('Failed to save');
      else { setExists(true); toast.success('Saved'); }
    }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Resume</h1>
        <Button onClick={save} size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {!exists && !content ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">Add your resume</p>
          <Button onClick={() => setContent(' ')} variant="outline" size="sm">
            Start writing
          </Button>
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your resume…"
          className="min-h-[400px] resize-none"
        />
      )}
    </div>
  );
}
