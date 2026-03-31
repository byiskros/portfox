import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ExternalLink } from 'lucide-react';

type Profile = Tables<'profiles'>;
type Case = Tables<'cases'>;
type Block = Tables<'blocks'>;

export default function PortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [resume, setResume] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'resume'>('projects');
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [caseBlocks, setCaseBlocks] = useState<Block[]>([]);
  const [caseTitle, setCaseTitle] = useState('');

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

        const [casesRes, resumeRes] = await Promise.all([
          supabase.from('cases').select('*').eq('user_id', prof.user_id).eq('status', 'published').order('created_at', { ascending: false }),
          supabase.from('resumes').select('content').eq('user_id', prof.user_id).maybeSingle(),
        ]);
        setCases(casesRes.data || []);
        setResume(resumeRes.data?.content || null);
        setLoading(false);
      });
  }, [slug]);

  const openCase = async (c: Case) => {
    setSelectedCase(c.id);
    setCaseTitle(c.title);
    const { data } = await supabase.from('blocks').select('*').eq('case_id', c.id).order('sort_order');
    setCaseBlocks(data || []);
  };

  const closeCase = () => {
    setSelectedCase(null);
    setCaseBlocks([]);
    setCaseTitle('');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Not found</div>;

  if (selectedCase) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
          <button onClick={closeCase} className="text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            ← Back to portfolio
          </button>
          <h1 className="text-2xl font-semibold text-foreground mb-8">{caseTitle}</h1>
          <div className="max-w-[720px] space-y-6">
            {caseBlocks.map((block) => (
              <div key={block.id}>
                {block.type === 'heading' && <h2 className="text-xl font-semibold text-foreground">{block.content}</h2>}
                {block.type === 'text' && <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{block.content}</p>}
                {block.type === 'image' && <img src={block.content} alt="" className="rounded-lg max-w-full" />}
              </div>
            ))}
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
          <h1 className="text-xl font-semibold text-foreground">{profile.name || 'Unnamed'}</h1>
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
            Projects
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`pb-2 text-sm transition-colors ${activeTab === 'resume' ? 'text-foreground border-b-2 border-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Resume
          </button>
        </div>

        {/* Content */}
        {activeTab === 'projects' && (
          <div>
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No published projects yet.</p>
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
          <div className="max-w-[720px] mx-auto">
            {resume ? (
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{resume}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No resume added yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
