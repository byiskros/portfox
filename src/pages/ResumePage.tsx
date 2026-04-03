import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Check, Loader2 } from 'lucide-react';
import PeriodPicker from '@/components/PeriodPicker';

interface WorkExperience {
  id: string;
  company: string;
  period: string;
  description: string;
  sort_order: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function ResumePage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [resumeExists, setResumeExists] = useState(false);
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('resumes').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('work_experiences').select('*').eq('user_id', user.id).order('sort_order'),
    ]).then(([resumeRes, expRes]) => {
      if (resumeRes.data) {
        setContent(resumeRes.data.content);
        setResumeExists(true);
      }
      if (expRes.data) setExperiences(expRes.data);
      setLoading(false);
    });
  }, [user]);

  const showSaved = useCallback(() => {
    setSaveStatus('saved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }, []);

  const saveResume = useCallback(async (text: string) => {
    if (!user) return;
    setSaveStatus('saving');
    if (resumeExists) {
      const { error } = await supabase.from('resumes').update({ content: text }).eq('user_id', user.id);
      if (error) { toast.error('Не удалось сохранить'); setSaveStatus('idle'); return; }
    } else {
      const { error } = await supabase.from('resumes').insert({ user_id: user.id, content: text });
      if (error) { toast.error('Не удалось сохранить'); setSaveStatus('idle'); return; }
      setResumeExists(true);
    }
    showSaved();
  }, [user, resumeExists, showSaved]);

  const handleContentChange = (text: string) => {
    setContent(text);
    const key = 'resume';
    clearTimeout(debounceRefs.current.get(key));
    debounceRefs.current.set(key, setTimeout(() => saveResume(text), 800));
  };

  const saveExperienceField = useCallback(async (id: string, field: string, value: string) => {
    setSaveStatus('saving');
    const { error } = await supabase.from('work_experiences').update({ [field]: value }).eq('id', id);
    if (error) { toast.error('Не удалось сохранить'); setSaveStatus('idle'); return; }
    showSaved();
  }, [showSaved]);

  const updateExperience = (id: string, field: keyof WorkExperience, value: string) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
    const key = `${id}-${field}`;
    clearTimeout(debounceRefs.current.get(key));
    debounceRefs.current.set(key, setTimeout(() => saveExperienceField(id, field, value), 800));
  };

  const addExperience = async () => {
    if (!user) return;
    const newOrder = experiences.length;
    const { data, error } = await supabase
      .from('work_experiences')
      .insert({ user_id: user.id, sort_order: newOrder })
      .select()
      .single();
    if (error) { toast.error('Не удалось добавить'); return; }
    if (data) setExperiences((prev) => [...prev, data]);
  };

  const deleteExperience = async (id: string) => {
    // Cancel pending saves for this experience
    debounceRefs.current.forEach((_, key) => {
      if (key.startsWith(id)) {
        clearTimeout(debounceRefs.current.get(key));
        debounceRefs.current.delete(key);
      }
    });
    setExperiences((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('work_experiences').delete().eq('id', id);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Резюме</h1>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Сохранение…</>}
          {saveStatus === 'saved' && <><Check className="h-3 w-3" /> Сохранено</>}
        </span>
      </div>

      {/* Free text */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">О себе</label>
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Расскажите о себе, навыках, образовании…"
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Work experiences */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Опыт работы</label>
          <Button onClick={addExperience} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        </div>

        {experiences.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Добавьте свой первый опыт работы</p>
            <Button onClick={addExperience} variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить опыт
            </Button>
          </div>
        )}

        {experiences.map((exp) => (
          <div key={exp.id} className="rounded-lg border border-border p-4 space-y-3 group relative">
            <button
              onClick={() => deleteExperience(exp.id)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Компания</label>
                <Input
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                  placeholder="Название компании"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Период</label>
                <PeriodPicker
                  value={exp.period}
                  onChange={(v) => updateExperience(exp.id, 'period', v)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Описание</label>
              <Textarea
                value={exp.description}
                onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                placeholder="Чем вы занимались…"
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
