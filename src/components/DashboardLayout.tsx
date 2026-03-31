import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layers, FileText, User, LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-sm font-semibold tracking-tight text-foreground">Portfolio</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" end className={linkClass}>
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </NavLink>
            <NavLink to="/resume" className={linkClass}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Resume</span>
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </NavLink>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors ml-2"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
