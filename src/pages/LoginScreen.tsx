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
    <div className="flex flex-col items-center justify-center h-svh bg-[#0a0a0a] px-8">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="text-[44px] text-gold-gradient mb-2 leading-none"
            style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 500 }}
          >
            食
          </div>
          <div className="text-[11px] tracking-[0.5em] text-[#c9a961]/70">WANT TO EAT</div>
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
            className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 rounded-[5px] px-4 py-3 text-[15px] text-[#f5f1e8] placeholder-[#555] tracking-wide focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 rounded-[5px] px-4 py-3 text-[15px] text-[#f5f1e8] placeholder-[#555] tracking-wide focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-[#a85959] text-[12px] tracking-wider text-center pt-1">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={busy || !email.trim() || !password}
            className="btn-primary w-full py-3.5 text-[14px] tracking-[0.3em] flex items-center justify-center gap-2 mt-2"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            登入
          </button>
        </div>

        <p className="text-[11px] text-[#555] tracking-wider text-center mt-8 leading-relaxed">
          沒有帳號嗎？請聯絡管理者開通。
        </p>
      </div>
    </div>
  );
}
