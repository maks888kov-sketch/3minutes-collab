/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function RefreshTimer({ onRefresh }) {
  const [seconds, setSeconds] = useState(180); // 3 min countdown

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { onRefresh(); return 180; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onRefresh]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
      style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}
    >
      <Clock className="w-4 h-4 text-primary" />
      <span className="text-sm text-muted-foreground">Новые анкеты через:</span>
      <span className="text-sm font-bold text-primary tabular-nums">{mm}:{ss}</span>
    </motion.div>
  );
}