import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';
import { Plus, X, Check, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          if (data.slug) setPublicUrl(`${window.location.origin}/${data.slug}`);
        }
        setLoading(false);
      });
  }, [user]);

  const update = (field: keyof Profile, value: any) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const checkSlug = async (slug: string) => {
    if (!slug || !user) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .neq('user_id', user.id)
      .maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  };

  const handleNameChange = (name: string) => {
    update('name', name);
    if (!profile?.slug || profile.slug === generateSlug(profile.name || '')) {
      const slug = generateSlug(name);
      update('slug', slug);
      checkSlug(slug);
    }
  };

  const handleSlugChange = (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    update('slug', clean);
    checkSlug(clean);
  };

  const addLink = () => {
    if (!newLink.trim()) return;
    const links = [...(profile?.links || []), newLink.trim()];
    update('links', links);
    setNewLink('');
  };

  const removeLink = (index: number) => {
    const links = [...(profile?.links || [])];
    links.splice(index, 1);
    update('links', links);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const url = await uploadImage(file, user.id, 'avatars');
      update('avatar_url', url);
    } catch {
      toast.error('Upload failed');
    }
  };

  const save = async () => {
    if (!profile || !user) return;
    if (slugStatus === 'taken') {
      toast.error('Slug is already taken');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        role: profile.role,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        links: profile.links,
        slug: profile.slug,
      })
      .eq('user_id', user.id);
    if (error) toast.error('Failed to save');
    else {
      toast.success('Saved');
      if (profile.slug) setPublicUrl(`${window.location.origin}/${profile.slug}`);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return null;

  const isIncomplete = !profile.name || !profile.slug;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        <Button onClick={save} size="sm" disabled={saving || slugStatus === 'taken'}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {isIncomplete && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">Complete your profile to share your portfolio</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Avatar</p>
          <ImageUpload
            onUpload={handleAvatarUpload}
            preview={profile.avatar_url}
            className="w-20 h-20 rounded-full overflow-hidden"
            label="Upload"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={profile.name || ''} onChange={(e) => handleNameChange(e.target.value)} placeholder="Your name" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <Input value={profile.role || ''} onChange={(e) => update('role', e.target.value)} placeholder="e.g. Product Designer" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Bio</label>
          <Textarea value={profile.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="A short bio…" className="resize-none min-h-[80px]" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Slug</label>
          <div className="flex items-center gap-2">
            <Input value={profile.slug || ''} onChange={(e) => handleSlugChange(e.target.value)} placeholder="your-slug" />
            {slugStatus === 'available' && <Check className="h-4 w-4 text-success shrink-0" />}
            {slugStatus === 'taken' && <X className="h-4 w-4 text-destructive shrink-0" />}
          </div>
          {slugStatus === 'taken' && <p className="text-xs text-destructive">This slug is already taken</p>}
          {publicUrl && <p className="text-xs text-muted-foreground">{publicUrl}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Links</label>
          {(profile.links || []).map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={link} readOnly className="text-sm" />
              <button onClick={() => removeLink(i)} className="p-1 hover:bg-secondary rounded">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://…"
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
            />
            <Button variant="outline" size="sm" onClick={addLink}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
