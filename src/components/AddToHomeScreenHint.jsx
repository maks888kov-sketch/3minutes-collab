/* b44-full-sync 2026-06-01 */
import { useEffect, useState } from 'react';
import { X, Smartphone } from 'lucide-react';

const DISMISS_KEY = '3minutes_hide_add_to_home_hint';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export default function AddToHomeScreenHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const narrow = window.innerWidth < 900;
    if (narrow) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-[5.5rem] left-0 right-0 z-[55] px-3">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-primary/30 bg-[#1a1228] px-4 py-3 shadow-xl">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Белая полоска внизу — это браузер</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ⋮ → «Добавить на главный экран» → открывай иконку 3Minutes (не вкладку). Тогда без белой панели.
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1');
              setVisible(false);
            }}
            className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
