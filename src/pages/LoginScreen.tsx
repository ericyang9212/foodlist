import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  onSignIn: (email: string, password: string) => Promise<string | null>;
}

export function LoginScreen({ onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const err = await onSignIn(email, password);
    setBusy(false);
    if (err) {
      setError(err.includes('Invalid') ? 'Email 或密碼錯誤' : err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-svh bg-bg px-8">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img
            src="/logo.png"
            alt="PSJ dice list"
            className="w-44 h-44 object-contain"
          />
        </div>

        <div className="space-y-3">
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-surface border border-separator focus:border-tint rounded-[14px] px-4 py-3 text-base text-text placeholder-muted focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full bg-surface border border-separator focus:border-tint rounded-[14px] px-4 py-3 text-base text-text placeholder-muted focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-danger text-[12px] text-center pt-1">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={busy || !email.trim() || !password}
            className="btn-primary w-full py-3.5 text-[14px] flex items-center justify-center gap-2 mt-2"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            登入
          </button>
        </div>
      </div>
    </div>
  );
}
