/* b44-full-sync 2026-06-01 */
import { motion } from 'framer-motion';

export default function DiscoverSkeleton() {
  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden">
      {/* shimmer bg */}
      <div className="w-full h-full" style={{ background: 'hsl(250,15%,12%)' }}>
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {/* bottom info skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
        <div className="w-40 h-7 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="w-24 h-4 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="flex gap-2">
          <div className="w-16 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="w-20 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="w-14 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>
      </div>
    </div>
  );
}