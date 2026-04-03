import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + '/dashboard' },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Портфолио</h1>
          <p className="text-sm text-muted-foreground">Войдите, чтобы управлять портфолио</p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">Проверьте почту</p>
            <p className="text-sm text-muted-foreground">
              Мы отправили ссылку для входа на <span className="font-medium text-foreground">{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Попробовать другой email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-10"
            />
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Отправка…' : 'Отправить ссылку'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
