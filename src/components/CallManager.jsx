/* Global incoming-call layer.
 *
 * Lives once near the app root. It registers this client's profile with the
 * realtime socket (so call signals can be addressed to us) and shows a
 * full-screen "incoming call" prompt when another user dials. Accepting
 * navigates to the call page as the callee; the rest of the negotiation runs
 * inside VideoCall via useWebRtcCall.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentProfile } from '@/lib/useProfile';

const INCOMING_TIMEOUT_MS = 35000;
const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop';

function CallEngine() {
  const { data: myProfile } = useCurrentProfile();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState(null);

  // Announce our profile so the server can route call signals to us.
  useEffect(() => {
    if (myProfile?.id) base44.setSignalingIdentity(myProfile.id);
  }, [myProfile?.id]);

  useEffect(() => {
    if (!myProfile?.id) return undefined;
    const off = base44.onSignal((msg) => {
      if (!msg) return;
      if (msg.signal === 'call-invite') {
        // Already in a call → tell the caller we're busy, don't stack prompts.
        if (window.location.pathname.startsWith('/video-call')) {
          base44.sendSignal({
            to: msg.from_profile_id,
            matchId: msg.match_id,
            signal: 'call-busy',
          });
          return;
        }
        setIncoming((cur) => cur || {
          matchId: msg.match_id,
          fromProfileId: msg.from_profile_id,
          name: msg.data?.callerName || 'Входящий звонок',
          photo: msg.data?.callerPhoto || FALLBACK_PHOTO,
          unlimited: !!msg.data?.unlimited,
        });
      } else if (msg.signal === 'call-cancel' || msg.signal === 'call-end') {
        setIncoming((cur) =>
          cur && cur.matchId === msg.match_id && cur.fromProfileId === msg.from_profile_id
            ? null
            : cur,
        );
      }
    });
    return off;
  }, [myProfile?.id]);

  // Stop ringing if the caller gives up / we don't answer.
  useEffect(() => {
    if (!incoming) return undefined;
    const t = setTimeout(() => setIncoming(null), INCOMING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [incoming]);

  const accept = () => {
    if (!incoming) return;
    const inc = incoming;
    base44.sendSignal({ to: inc.fromProfileId, matchId: inc.matchId, signal: 'call-accept' });
    setIncoming(null);
    navigate(`/video-call/${inc.matchId}`, {
      state: { role: 'callee', peerProfileId: inc.fromProfileId },
    });
  };

  const decline = () => {
    if (!incoming) return;
    base44.sendSignal({ to: incoming.fromProfileId, matchId: incoming.matchId, signal: 'call-reject' });
    setIncoming(null);
  };

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex flex-col items-center justify-between bg-black/90 backdrop-blur-2xl py-16 px-8"
        >
          <div className="flex flex-col items-center mt-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Video className="w-4 h-4 text-primary" />
              <span>{incoming.unlimited ? 'Видеозвонок' : 'Видео-знакомство'}</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary neon-glow mb-5"
            >
              <img src={incoming.photo} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-1">{incoming.name}</h2>
            <p className="text-sm text-muted-foreground">звонит вам...</p>
          </div>

          <div className="flex items-center justify-center gap-16 w-full mb-4">
            <button
              type="button"
              onClick={decline}
              className="flex flex-col items-center gap-2"
              aria-label="Отклонить звонок"
            >
              <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 0 24px rgba(239,68,68,0.5)' }}>
                <PhoneOff className="w-7 h-7 text-white" />
              </span>
              <span className="text-xs text-muted-foreground">Отклонить</span>
            </button>
            <button
              type="button"
              onClick={accept}
              className="flex flex-col items-center gap-2"
              aria-label="Принять звонок"
            >
              <motion.span
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 0 24px rgba(34,197,94,0.6)' }}
              >
                <Phone className="w-7 h-7 text-white" />
              </motion.span>
              <span className="text-xs text-muted-foreground">Принять</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CallManager() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <CallEngine />;
}
