import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Tone = 'erfolg' | 'hinweis' | 'fehler';
interface ToastMessage {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

/** Kurze Rückmeldungen („Gespeichert“), die auch Screenreader vorlesen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((text: string, tone: Tone = 'erfolg') => {
    setMessage({ id: Date.now(), text, tone });
  }, []);

  useEffect(() => {
    if (!message) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), message.tone === 'fehler' ? 8000 : 4500);
    return () => window.clearTimeout(timer.current);
  }, [message]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div key={message.id} className={`toast toast--${message.tone}`}>
            <span>{message.text}</span>
            <button type="button" className="toast__close" onClick={() => setMessage(null)} aria-label="Meldung schließen">
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
