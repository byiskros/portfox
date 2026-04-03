import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layers, FileText, User, LogOut, ExternalLink } from 'lucide-react';

export default function DashboardLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('slug').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.slug) setSlug(data.slug);
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-sm font-semibold tracking-tight text-foreground">Портфолио</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" end className={linkClass}>
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Проекты</span>
            </NavLink>
            <NavLink to="/resume" className={linkClass}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Резюме</span>
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Профиль</span>
            </NavLink>
            {slug ? (
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors ml-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Портфолио</span>
              </a>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground/50 ml-1 cursor-default" title="Сначала укажите URL профиля">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Портфолио</span>
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors ml-2"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
