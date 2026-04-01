import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [otp, setOtp] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setStep('code');
    }
  };

  const handleVerifyCode = async (value: string) => {
    if (value.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: value,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      toast.error('Invalid code. Try again.');
      setOtp('');
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      handleVerifyCode(value);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Sign in to build your portfolio</p>
        </div>

        {step === 'code' ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Enter the code</p>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} disabled={loading}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {loading && <p className="text-xs text-muted-foreground">Verifying…</p>}
            <div className="flex items-center justify-center gap-3 text-sm">
              <button
                onClick={() => { setStep('email'); setOtp(''); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Change email
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Resend code
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendCode} className="space-y-4">
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
              {loading ? 'Sending…' : 'Send login code'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
