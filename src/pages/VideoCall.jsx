/* b44-full-sync 2026-06-01 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useCurrentProfile } from '@/lib/useProfile';
import {
  isUnlimitedVideoCall,
  INTRO_VIDEO_DURATION_SEC,
} from '@/lib/chatMatchUtils';
import { isTestBotMatchId } from '@/lib/testBots';
import {
  getTestBotMatch,
  resolveTestBotOtherProfile,
  completeTestBotVideoCall,
} from '@/lib/testBotStore';
import { useWebRtcCall } from '@/lib/useWebRtcCall';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Heart,
  Hand, Timer, Sparkles, Loader2, X, PhoneMissed
} from 'lucide-react';

// phase: lobby → ringing → connecting → active → rating → choice / ended
function formatCallDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ENDED_COPY = {
  rejected: { title: 'Звонок отклонён', sub: 'Пользователь сейчас не может говорить' },
  'no-answer': { title: 'Нет ответа', sub: 'Попробуйте позвонить чуть позже' },
  busy: { title: 'Занято', sub: 'Пользователь уже в другом звонке' },
  failed: { title: 'Связь прервалась', sub: 'Не удалось установить соединение' },
  'no-camera': { title: 'Нет доступа к камере', sub: 'Разрешите камеру и микрофон в настройках браузера' },
  'peer-left': { title: 'Звонок завершён', sub: 'Собеседник вышел из звонка' },
  cancelled: { title: 'Звонок отменён', sub: '' },
};

export default function VideoCall() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: myProfile } = useCurrentProfile();
  const queryClient = useQueryClient();

  const isTestCall = isTestBotMatchId(matchId);
  const role = location.state?.role === 'callee' ? 'callee' : 'caller';

  const [phase, setPhase] = useState(
    !isTestCall && role === 'callee' ? 'connecting' : 'lobby'
  );
  const [timeLeft, setTimeLeft] = useState(INTRO_VIDEO_DURATION_SEC);
  const [elapsed, setElapsed] = useState(0);
  const [testMuted, setTestMuted] = useState(false);
  const [testVideoOff, setTestVideoOff] = useState(false);
  const [rating, setRating] = useState(null);
  const [choice, setChoice] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const leftRef = useRef(false);
  const wasActiveRef = useRef(false);
  const [otherProfile, setOtherProfile] = useState(null);

  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (isTestBotMatchId(matchId)) return getTestBotMatch(matchId);
      const ms = await base44.entities.Match.filter({ id: matchId });
      return ms[0] || null;
    },
    enabled: !!matchId,
  });

  const peerId = useMemo(() => {
    if (!match || !myProfile) return null;
    return match.profile_a_id === myProfile.id ? match.profile_b_id : match.profile_a_id;
  }, [match, myProfile]);

  useEffect(() => {
    if (!match || !myProfile) return;
    if (isTestBotMatchId(match.id)) {
      setOtherProfile(resolveTestBotOtherProfile(match, myProfile.id));
      return;
    }
    const otherId = match.profile_a_id === myProfile.id ? match.profile_b_id : match.profile_a_id;
    base44.entities.Profile.filter({ id: otherId }).then((ps) => {
      if (ps[0]) setOtherProfile(ps[0]);
    });
  }, [match, myProfile]);

  const isUnlimitedCall = isUnlimitedVideoCall(match);

  const callerInfo = useMemo(() => ({
    callerName: myProfile?.name || 'Звонок',
    callerPhoto: myProfile?.photos?.[0] || '',
    unlimited: isUnlimitedCall,
  }), [myProfile?.name, myProfile?.photos, isUnlimitedCall]);

  const call = useWebRtcCall({
    enabled: !isTestCall && !!matchId && !!peerId && !!myProfile,
    role,
    matchId,
    peerProfileId: peerId,
    callerInfo,
  });
  // Destructure into stable references so effects don't re-run every render.
  const {
    status: callStatus,
    endedReason,
    muted: callMuted,
    videoOff: callVideoOff,
    localStream,
    remoteStream,
    prepareCamera,
    start: startCall,
    hangup: hangupCall,
    cancel: cancelCall,
    toggleMute: callToggleMute,
    toggleVideo: callToggleVideo,
  } = call;

  const muted = isTestCall ? testMuted : callMuted;
  const videoOff = isTestCall ? testVideoOff : callVideoOff;
  const toggleMute = () => (isTestCall ? setTestMuted((m) => !m) : callToggleMute());
  const toggleVideo = () => (isTestCall ? setTestVideoOff((v) => !v) : callToggleVideo());

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const finishUnlimitedCall = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (isTestCall) stopCamera();
    else hangupCall();
    navigate(`/chat/${matchId}`);
  }, [isTestCall, hangupCall, matchId, navigate]);

  const handleCancel = () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (isTestCall) stopCamera();
    else cancelCall();
    navigate(`/chat/${matchId}`);
  };

  const handleStartCall = () => {
    if (isTestCall) {
      setElapsed(0);
      setTimeLeft(INTRO_VIDEO_DURATION_SEC);
      setPhase('connecting');
      window.setTimeout(() => setPhase('active'), 1200);
    } else {
      startCall();
    }
  };

  // Test-bot path keeps a simple local camera preview.
  useEffect(() => {
    if (!isTestCall) return undefined;
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        // Camera optional for preview
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isTestCall]);

  // Real path: warm up the camera for the caller's lobby preview.
  useEffect(() => {
    if (isTestCall || role !== 'caller' || !peerId || !myProfile) return;
    prepareCamera().catch(() => {});
  }, [isTestCall, role, peerId, myProfile, prepareCamera]);

  // Real path: the callee already accepted — connect automatically.
  useEffect(() => {
    if (isTestCall || role !== 'callee' || !peerId || !myProfile) return;
    startCall();
  }, [isTestCall, role, peerId, myProfile, startCall]);

  // Real path: bind media streams to the video elements.
  useEffect(() => {
    if (isTestCall) return;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [isTestCall, localStream]);

  useEffect(() => {
    if (isTestCall) return;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
  }, [isTestCall, remoteStream]);

  // Real path: drive the page phase from the call's connection status.
  useEffect(() => {
    if (isTestCall) return;
    const st = callStatus;
    if (st === 'ringing') {
      setPhase('ringing');
    } else if (st === 'connecting') {
      setPhase((p) => (p === 'rating' || p === 'choice' ? p : 'connecting'));
    } else if (st === 'connected') {
      setPhase((p) => (p === 'rating' || p === 'choice' ? p : 'active'));
    } else if (st === 'ended') {
      if (wasActiveRef.current) {
        if (isUnlimitedCall) finishUnlimitedCall();
        else setPhase((p) => (p === 'choice' ? p : 'rating'));
      } else {
        setPhase('ended');
      }
    }
  }, [isTestCall, callStatus, isUnlimitedCall, finishUnlimitedCall]);

  useEffect(() => {
    if (phase === 'active') wasActiveRef.current = true;
  }, [phase]);

  // Real path: hang up the peer connection whenever we enter the rating screen
  // (covers both the 3-min timeout and the manual "end call" button).
  useEffect(() => {
    if (isTestCall) return;
    if (phase === 'rating') hangupCall();
  }, [phase, isTestCall, hangupCall]);

  // Таймер первого знакомства (3 мин)
  useEffect(() => {
    if (phase !== 'active' || isUnlimitedCall) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('rating');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isUnlimitedCall]);

  // Безлимитный звонок — считаем время на связи
  useEffect(() => {
    if (phase !== 'active' || !isUnlimitedCall) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isUnlimitedCall]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (INTRO_VIDEO_DURATION_SEC - timeLeft) / INTRO_VIDEO_DURATION_SEC;

  const handleEndCall = () => {
    if (isUnlimitedCall) {
      finishUnlimitedCall();
      return;
    }
    setPhase('rating');
  };

  const handleRating = (r) => setRating(r);

  const handleChoice = async (result) => {
    setChoice(result);

    if (match && myProfile) {
      if (isTestCall) {
        completeTestBotVideoCall(matchId, myProfile.id, result);
        queryClient.invalidateQueries({ queryKey: ['match', matchId] });
        queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
      } else {
        const isA = match.profile_a_id === myProfile.id;
        const myField = isA ? 'video_result_a' : 'video_result_b';
        const otherField = isA ? 'video_result_b' : 'video_result_a';
        const otherResult = match[otherField];

        await base44.entities.Match.update(match.id, {
          [myField]: result,
          status: result === 'end' ? 'ended' : match.status,
        });

        if (result === 'continue' && otherResult === 'continue') {
          await base44.entities.Match.update(match.id, { status: 'video_unlocked' });
          await base44.entities.Message.create({
            match_id: matchId,
            sender_profile_id: myProfile.id,
            type: 'system',
            content: '🎉 Вам понравилось общение! Фото, голосовые и безлимитные видеозвонки разблокированы',
          });
        }

        queryClient.invalidateQueries({ queryKey: ['match', matchId] });
        queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
      }
    }

    setTimeout(() => {
      if (result === 'continue') {
        navigate(`/chat/${matchId}`);
      } else {
        navigate('/matches');
      }
    }, 1800);
  };

  const otherPhoto = otherProfile?.photos?.[0]
    || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop';

  const showRemoteVideo = !isTestCall && !!remoteStream;

  const reactions = [
    { key: 'bad', emoji: '😕', label: 'Не очень' },
    { key: 'ok', emoji: '🙂', label: 'Нормально' },
    { key: 'great', emoji: '😍', label: 'Отлично' },
  ];

  const endedCopy = ENDED_COPY[endedReason] || ENDED_COPY.cancelled;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Cancel — lobby / ringing / connecting / active */}
      {(phase === 'lobby' || phase === 'ringing' || phase === 'connecting' || phase === 'active') && (
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-0 left-0 z-30 safe-top m-4 w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="Отменить и вернуться в чат"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Remote video / photo bg */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${showRemoteVideo ? '' : 'hidden'}`}
        />
        {!showRemoteVideo && (
          <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* LOBBY — ждём подтверждения */}
      <AnimatePresence>
        {phase === 'lobby' && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xl px-8"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary neon-glow mb-5">
              <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{otherProfile?.name || '...'}</h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
              {isUnlimitedCall
                ? 'Свободный видеозвонок — общайтесь сколько угодно. Можно отменить и вернуться в чат.'
                : 'Готов к 3-минутной видео-встрече? Можно отменить — вернёшься в чат.'}
            </p>
            <Button
              onClick={handleStartCall}
              className="w-full max-w-xs h-14 text-base font-semibold gradient-primary rounded-2xl border-0 neon-glow mb-3"
            >
              <Video className="w-5 h-5 mr-2" />
              {isUnlimitedCall ? 'Начать звонок' : 'Начать встречу'}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Не сейчас — вернуться в чат
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RINGING — звоним собеседнику (real call, caller) */}
      <AnimatePresence>
        {phase === 'ringing' && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xl px-8"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary neon-glow mb-5"
            >
              <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">{otherProfile?.name || '...'}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Звоним...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONNECTING */}
      <AnimatePresence>
        {phase === 'connecting' && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xl"
          >
            {/* Avatar with single subtle ring */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary neon-glow">
                <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{otherProfile?.name || '...'}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Соединяемся...</span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              {isUnlimitedCall ? 'Без ограничения по времени' : 'Видео-встреча на 3 минуты'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENDED — звонок не состоялся (rejected / no-answer / busy / failed) */}
      <AnimatePresence>
        {phase === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl px-8"
          >
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-5">
              <PhoneMissed className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 text-center">{endedCopy.title}</h2>
            {endedCopy.sub && (
              <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">{endedCopy.sub}</p>
            )}
            <Button
              onClick={() => navigate(`/chat/${matchId}`)}
              className="w-full max-w-xs h-12 gradient-primary rounded-2xl border-0"
            >
              Вернуться в чат
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE — Timer / elapsed */}
      {phase === 'active' && (
        <div className="relative z-10 safe-top flex justify-center pt-6">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-strong rounded-2xl px-6 py-3 flex items-center gap-3"
          >
            {isUnlimitedCall ? (
              <>
                <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                  <Timer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums text-white">
                    {formatCallDuration(elapsed)}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">на связи</div>
                </div>
              </>
            ) : (
              <>
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle
                      cx="20" cy="20" r="17" fill="none"
                      stroke={timeLeft <= 30 ? 'hsl(0, 72%, 51%)' : 'hsl(270, 80%, 60%)'}
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 17}`}
                      strokeDashoffset={`${2 * Math.PI * 17 * (1 - progress)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <Timer className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <div className={`text-2xl font-bold tabular-nums ${timeLeft <= 30 ? 'text-red-400' : 'text-white'}`}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">осталось</div>
                </div>
              </>
            )}
            <div className="flex items-center gap-1.5 ml-2 glass rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[11px] text-white/70">В эфире</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Local video PiP */}
      {(phase === 'lobby' || phase === 'ringing' || phase === 'connecting' || phase === 'active') && (
      <div className="absolute top-24 right-4 z-20 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''}`} />
        {videoOff && (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      )}

      {/* RATING SCREEN */}
      <AnimatePresence>
        {phase === 'rating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl px-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.15 }}
            >
              <Sparkles className="w-14 h-14 text-primary mx-auto mb-5" />
            </motion.div>
            <motion.h2
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-2xl font-bold text-white mb-2 text-center"
            >
              Как прошло ваше знакомство?
            </motion.h2>
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="text-muted-foreground text-sm text-center mb-8"
            >
              Ваши впечатления помогут улучшить рекомендации
            </motion.p>

            {/* Reaction buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 mb-10"
            >
              {reactions.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleRating(r.key)}
                  className={`flex flex-col items-center gap-2 px-5 py-4 rounded-2xl transition-all ${
                    rating === r.key
                      ? 'bg-primary/30 border border-primary scale-110'
                      : 'glass border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">{r.emoji}</span>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </button>
              ))}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3"
            >
              <Button
                onClick={() => handleChoice('continue')}
                className="w-full h-14 text-base font-semibold gradient-primary rounded-2xl border-0 neon-glow"
              >
                <Heart className="w-5 h-5 mr-2" fill="white" />
                Продолжить общение
              </Button>
              <Button
                onClick={() => handleChoice('end')}
                variant="ghost"
                className="w-full h-12 text-base text-muted-foreground rounded-2xl glass"
              >
                <Hand className="w-5 h-5 mr-2" />
                Завершить знакомство
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHOICE CONFIRMATION */}
      <AnimatePresence>
        {choice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-2xl"
          >
            <div className="text-center px-8">
              {choice === 'continue' ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.8 }}
                  >
                    <Heart className="w-20 h-20 text-accent mx-auto mb-4" fill="hsl(330, 85%, 60%)" />
                  </motion.div>
                  <h2 className="text-2xl font-bold gradient-text mb-2">Отлично!</h2>
                  <p className="text-muted-foreground">Вы решили продолжить общение 💜</p>
                  <p className="text-sm text-muted-foreground mt-1">Переходим в чат...</p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: 1 }}
                  >
                    <Hand className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">До встречи!</h2>
                  <p className="text-muted-foreground">Новые знакомства ждут...</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTROLS */}
      {phase === 'active' && (
        <div className="relative z-10 mt-auto pb-12 safe-bottom">
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                muted ? 'bg-white/25 border border-white/30' : 'glass'
              }`}
            >
              {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 0 24px rgba(239,68,68,0.5)' }}
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                videoOff ? 'bg-white/25 border border-white/30' : 'glass'
              }`}
            >
              {videoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
