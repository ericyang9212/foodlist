import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,      // session 存 localStorage，登入一次就記住
    autoRefreshToken: true,    // token 自動續期
    detectSessionInUrl: true,  // 支援 magic link / 信箱確認回跳
  },
});
