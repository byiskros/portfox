import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ExternalLink } from 'lucide-react';

type Profile = Tables<'profiles'>;
type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;

interface WorkExperience {
  id: string;
  company: string;
  period: string;
  description: string;
  sort_order: number;
}

export default function PortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [resume, setResume] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'resume'>('projects');
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [caseBlocks, setCaseBlocks] = useState<Block[]>([]);
  const [caseData, setCaseData] = useState<Case | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(async ({ data: prof }) => {
        if (!prof) { setLoading(false); return; }
        setProfile(prof);

        const [casesRes, resumeRes, expRes] = await Promise.all([
          supabase.from('cases').select('*').eq('user_id', prof.user_id).eq('status', 'published').order('created_at', { ascending: false }),
          supabase.from('resumes').select('content').eq('user_id', prof.user_id).maybeSingle(),
          supabase.from('work_experiences').select('*').eq('user_id', prof.user_id).order('sort_order'),
        ]);
        setCases(casesRes.data || []);
        setResume(resumeRes.data?.content || null);
        setExperiences(expRes.data || []);
        setLoading(false);
      });
  }, [slug]);

  const openCase = async (c: Case) => {
    setSelectedCase(c.id);
    const [freshCase, blocksRes] = await Promise.all([
      supabase.from('cases').select('*').eq('id', c.id).single(),
      supabase.from('blocks').select('*').eq('case_id', c.id).order('sort_order'),
    ]);
    setCaseData(freshCase.data || c);
    setCaseBlocks(blocksRes.data || []);
  };

  const closeCase = () => {
    setSelectedCase(null);
    setCaseBlocks([]);
    setCaseData(null);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>;
  if (!profile) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Не найдено</div>;

  const AuthorCard = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center gap-3 ${className}`}>
      {profile!.avatar_url && (
        <img src={profile!.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{profile!.name || 'Без имени'}</p>
        {profile!.role && <p className="text-xs text-muted-foreground">{profile!.role}</p>}
      </div>
      {profile!.links && profile!.links.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          {profile!.links.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ExternalLink className="h-3 w-3" />
              {new URL(link).hostname}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  if (selectedCase) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-8">
          <button onClick={closeCase} className="text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            ← Назад к портфолио
          </button>
          <AuthorCard className="mb-6" />
          <h1 className="text-[2rem] md:text-[2.25rem] font-bold leading-[1.2] text-foreground mb-3">{caseData?.title}</h1>
          {(caseData as any)?.description && (
            <p className="text-lg leading-[1.6] text-muted-foreground mb-10">{(caseData as any).description}</p>
          )}
          {!((caseData as any)?.description) && <div className="mb-10" />}
          <div className="space-y-4">
            {caseBlocks.map((block) => (
              <div key={block.id}>
                {block.type === 'heading' && <h2 className="text-xl md:text-2xl font-semibold leading-[1.3] text-foreground pt-4">{block.content}</h2>}
                {block.type === 'text' && <p className="text-lg leading-[1.8] text-muted-foreground whitespace-pre-wrap">{block.content}</p>}
                {block.type === 'image' && <img src={block.content} alt="" className="rounded-xl shadow-sm w-full my-4" />}
              </div>
            ))}
          </div>
          <div className="mt-16 pt-8 border-t border-border">
            <AuthorCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          {profile.avatar_url && (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mb-4" />
          )}
          <h1 className="text-xl font-semibold text-foreground">{profile.name || 'Без имени'}</h1>
          {profile.role && <p className="text-sm text-muted-foreground mt-1">{profile.role}</p>}
          {profile.bio && <p className="text-sm text-foreground/70 mt-3 max-w-md">{profile.bio}</p>}
          {profile.links && profile.links.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {profile.links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 border-b border-border mb-8">
          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-2 text-sm transition-colors ${activeTab === 'projects' ? 'text-foreground border-b-2 border-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Проекты
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`pb-2 text-sm transition-colors ${activeTab === 'resume' ? 'text-foreground border-b-2 border-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Резюме
          </button>
        </div>

        {/* Content */}
        {activeTab === 'projects' && (
          <div>
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">Пока нет опубликованных проектов.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border overflow-hidden cursor-pointer hover:border-foreground/20 transition-colors"
                    onClick={() => openCase(c)}
                  >
                    <div className="aspect-[16/10] bg-secondary">
                      {c.cover_image_url && <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="max-w-[720px] mx-auto space-y-8">
            {resume && (
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{resume}</div>
            )}

            {experiences.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Опыт работы</h2>
                {experiences.map((exp) => (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-sm font-medium text-foreground">{exp.company}</h3>
                      {exp.period && <span className="text-xs text-muted-foreground shrink-0">{exp.period}</span>}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!resume && experiences.length === 0 && (
              <p className="text-sm text-muted-foreground">Резюме ещё не добавлено.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
