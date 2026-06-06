// 極簡 toast：module-level emitter，不需要 context provider 包整個 app
export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  listeners.forEach(l => l(toasts));
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  l(toasts);
  return () => { listeners.delete(l); };
}

export function showToast(message: string, kind: ToastKind = 'info', durationMs = 3200) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => dismissToast(id), durationMs);
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

// 便利函式
export const toast = {
  success: (m: string) => showToast(m, 'success'),
  error: (m: string) => showToast(m, 'error', 4500),
  info: (m: string) => showToast(m, 'info'),
};
