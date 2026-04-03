import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';
import { Check, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const update = (field: string, value: any) => {
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

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const url = await uploadImage(file, user.id, 'avatars');
      update('avatar_url', url);
    } catch {
      toast.error('Не удалось загрузить');
    }
  };

  const save = async () => {
    if (!profile || !user) return;
    if (slugStatus === 'taken') {
      toast.error('Этот URL уже занят');
      return;
    }
    setSaving(true);
    const p = profile as any;
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        role: profile.role,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        slug: profile.slug,
        telegram: p.telegram || '',
        linkedin: p.linkedin || '',
        phone: p.phone || '',
        custom_link: p.custom_link || '',
      } as any)
      .eq('user_id', user.id);
    if (error) toast.error('Не удалось сохранить');
    else {
      toast.success('Сохранено');
      if (profile.slug) setPublicUrl(`${window.location.origin}/${profile.slug}`);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Загрузка…</div>;
  if (!profile) return null;

  const p = profile as any;
  const isIncomplete = !profile.name || !profile.slug;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Профиль</h1>
        <Button onClick={save} size="sm" disabled={saving || slugStatus === 'taken'}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>

      {isIncomplete && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">Заполните профиль, чтобы поделиться портфолио</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Аватар</p>
          <ImageUpload
            onUpload={handleAvatarUpload}
            preview={profile.avatar_url}
            className="w-20 h-20 rounded-full overflow-hidden"
            label="Загрузить"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Имя</label>
          <Input value={profile.name || ''} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ваше имя" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Роль</label>
          <Input value={profile.role || ''} onChange={(e) => update('role', e.target.value)} placeholder="Например, Продуктовый дизайнер" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">О себе</label>
          <Textarea value={profile.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="Краткое описание…" className="resize-none min-h-[80px]" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">URL</label>
          <div className="flex items-center gap-2">
            <Input value={profile.slug || ''} onChange={(e) => handleSlugChange(e.target.value)} placeholder="your-slug" />
            {slugStatus === 'available' && <Check className="h-4 w-4 text-success shrink-0" />}
            {slugStatus === 'taken' && <span className="text-xs text-destructive shrink-0">Занят</span>}
          </div>
          {slugStatus === 'taken' && <p className="text-xs text-destructive">Этот URL уже занят</p>}
          {publicUrl && <p className="text-xs text-muted-foreground">{publicUrl}</p>}
        </div>

        {/* Contacts */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-foreground">Контакты</p>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Telegram</label>
            <Input value={p.telegram || ''} onChange={(e) => update('telegram', e.target.value)} placeholder="@username или https://t.me/username" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">LinkedIn</label>
            <Input value={p.linkedin || ''} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Почта</label>
            <Input type="email" value={profile.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Телефон</label>
            <Input value={p.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="+7 999 123-45-67" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Другая ссылка</label>
            <Input value={p.custom_link || ''} onChange={(e) => update('custom_link', e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </div>
    </div>
  );
}
