/* b44-full-sync 2026-06-01 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { showNotification } from '@/components/AppNotifications';
import { useCurrentProfile, useMessages } from '@/lib/useProfile';
import { isProfileOnline } from '@/lib/profileUtils';
import { isTestBotMatchId } from '@/lib/testBots';
import {
  getTestBotMatch,
  sendTestBotMessage,
  addTestBotAutoReply,
  markTestBotMatchRead,
  resolveTestBotOtherProfile,
  setTestBotVideoConsent,
  sendTestBotMediaMessage,
} from '@/lib/testBotStore';
import {
  isMediaUnlocked,
  isVideoReady,
  getVideoConsent,
} from '@/lib/chatMatchUtils';
import { uploadPublicFile } from '@/lib/uploadFile';
import { isProfileBlocked } from '@/lib/moderation';
import { useModerationActions } from '@/lib/useModeration';
import ReportBlockSheet from '@/components/chat/ReportBlockSheet';
import ChatProfileSheet from '@/components/chat/ChatProfileSheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Send, Video, Image, Mic, Lock,
  CheckCheck, Loader2, Clock, X, Flag, Info
} from 'lucide-react';
import { format } from 'date-fns';

function getVoiceMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function formatRecordingTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: myProfile } = useCurrentProfile();
  const { data: messages = [], isLoading: msgsLoading } = useMessages(matchId);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const unreadClearedRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const cancelRecordingRef = useRef(false);
  const recordingTimerRef = useRef(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const { blockUser, submitReport } = useModerationActions();
  const moderationBusy = blockUser.isPending || submitReport.isPending;

  const isTestChat = isTestBotMatchId(matchId);

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (isTestBotMatchId(matchId)) return getTestBotMatch(matchId);
      const matches = await base44.entities.Match.filter({ id: matchId });
      return matches[0] || null;
    },
    enabled: !!matchId,
    refetchInterval: isTestChat ? 1000 : 3000,
  });

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

  useEffect(() => {
    if (!match || !myProfile || unreadClearedRef.current) return;
    const isA = match.profile_a_id === myProfile.id;
    const myUnread = isA ? match.unread_count_a : match.unread_count_b;
    if (!myUnread) return;

    unreadClearedRef.current = true;

    if (isTestBotMatchId(match.id)) {
      markTestBotMatchRead(match.id, myProfile.id);
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['chatList'] });
      return;
    }

    base44.entities.Match.update(match.id, {
      [isA ? 'unread_count_a' : 'unread_count_b']: 0,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['chatList'] });
    });
  }, [match, myProfile, matchId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!recording) return undefined;
    const interval = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const mediaUnlocked = isMediaUnlocked(match);
  const videoReady = isVideoReady(match);
  const myConsent = getVideoConsent(match, myProfile?.id);
  const theirConsent = match && myProfile && (
    match.profile_a_id === myProfile.id ? match.video_consent_b : match.video_consent_a
  );

  const invalidateChat = () => {
    queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['chatList'] });
    queryClient.invalidateQueries({ queryKey: ['match', matchId] });
  };

  const notifyMediaLocked = () => {
    showNotification({
      type: 'info',
      title: 'Пока недоступно',
      body: 'Фото и голосовые откроются после 3-минутной видео-встречи, если вы оба захотите продолжить',
    });
  };

  const appendOptimisticMessage = (message) => {
    queryClient.setQueryData(['messages', matchId], (old = []) => [...old, message]);
  };

  const sendMessage = async () => {
    if (!text.trim() || !myProfile || sending) return;
    if (!isTestChat && !match) return;

    setSending(true);
    const msg = text.trim();
    setText('');

    try {
      if (isTestChat) {
        const optimistic = {
          id: `tmp-${Date.now()}`,
          match_id: matchId,
          sender_profile_id: myProfile.id,
          type: 'text',
          content: msg,
          created_date: new Date().toISOString(),
        };
        appendOptimisticMessage(optimistic);

        const saved = sendTestBotMessage(matchId, myProfile.id, msg);
        if (!saved) {
          throw new Error('test send failed');
        }

        invalidateChat();

        const currentMatch = getTestBotMatch(matchId) || match;
        const otherId = currentMatch?.profile_a_id === myProfile.id
          ? currentMatch?.profile_b_id
          : currentMatch?.profile_a_id;

        if (otherId) {
          setTimeout(() => {
            addTestBotAutoReply(matchId, otherId);
            invalidateChat();
          }, 1200);
        }
        return;
      }

      await base44.entities.Message.create({
        match_id: matchId,
        sender_profile_id: myProfile.id,
        type: 'text',
        content: msg,
      });
      const isA = match.profile_a_id === myProfile.id;
      const otherUnread = isA ? match.unread_count_b || 0 : match.unread_count_a || 0;
      await base44.entities.Match.update(match.id, {
        last_message_text: msg,
        last_message_time: new Date().toISOString(),
        [isA ? 'unread_count_b' : 'unread_count_a']: otherUnread + 1,
      });
      invalidateChat();
    } catch {
      showNotification({
        type: 'error',
        title: 'Не отправилось',
        body: 'Проверь интернет и попробуй ещё раз',
      });
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const sendPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !myProfile) return;
    if (!isTestChat && !match) return;

    if (!mediaUnlocked) {
      notifyMediaLocked();
      return;
    }

    try {
      if (isTestChat) {
        const dataUrl = await fileToDataUrl(file);
        sendTestBotMediaMessage(matchId, myProfile.id, 'photo', dataUrl);
        invalidateChat();
        return;
      }

      const file_url = await uploadPublicFile(file);
      await base44.entities.Message.create({
        match_id: matchId,
        sender_profile_id: myProfile.id,
        type: 'photo',
        content: file_url,
      });
      const isA = match.profile_a_id === myProfile.id;
      const otherUnread = isA ? match.unread_count_b || 0 : match.unread_count_a || 0;
      await base44.entities.Match.update(match.id, {
        last_message_text: '📷 Фото',
        last_message_time: new Date().toISOString(),
        [isA ? 'unread_count_b' : 'unread_count_a']: otherUnread + 1,
      });
      invalidateChat();
    } catch {
      showNotification({ type: 'error', title: 'Не удалось отправить фото', body: 'Попробуй ещё раз' });
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const resetRecordingState = () => {
    clearRecordingTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
    cancelRecordingRef.current = false;
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const sendRecording = () => {
    cancelRecordingRef.current = false;
    stopRecording();
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    clearRecordingTimer();
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    } else {
      resetRecordingState();
    }
  };

  const startVoiceRecording = async () => {
    if (!myProfile) return;
    if (!isTestChat && !match) return;
    if (!mediaUnlocked) {
      notifyMediaLocked();
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      showNotification({
        type: 'error',
        title: 'Голосовые недоступны',
        body: 'Этот браузер не поддерживает запись голоса',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getVoiceMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const recordedMime = mimeType || recorder.mimeType || 'audio/webm';
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const cancelled = cancelRecordingRef.current;
        cancelRecordingRef.current = false;
        clearRecordingTimer();

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setRecording(false);
        setRecordingSeconds(0);

        if (cancelled) {
          chunksRef.current = [];
          return;
        }

        const blob = new Blob(chunksRef.current, { type: recordedMime });
        chunksRef.current = [];
        if (blob.size < 500) return;

        try {
          if (isTestChat) {
            const dataUrl = await fileToDataUrl(blob);
            sendTestBotMediaMessage(matchId, myProfile.id, 'voice', dataUrl);
            invalidateChat();
            return;
          }

          const ext = recordedMime.includes('mp4') ? 'm4a' : 'webm';
          const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: recordedMime });
          const file_url = await uploadPublicFile(file);
          await base44.entities.Message.create({
            match_id: matchId,
            sender_profile_id: myProfile.id,
            type: 'voice',
            content: file_url,
          });
          const isA = match.profile_a_id === myProfile.id;
          const otherUnread = isA ? match.unread_count_b || 0 : match.unread_count_a || 0;
          await base44.entities.Match.update(match.id, {
            last_message_text: '🎤 Голосовое',
            last_message_time: new Date().toISOString(),
            [isA ? 'unread_count_b' : 'unread_count_a']: otherUnread + 1,
          });
          invalidateChat();
        } catch {
          showNotification({ type: 'error', title: 'Не удалось отправить', body: 'Голосовое не загрузилось' });
        }
      };

      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = window.setTimeout(() => sendRecording(), 60000);
    } catch {
      showNotification({
        type: 'error',
        title: 'Нет доступа к микрофону',
        body: 'Разреши микрофон в настройках браузера',
      });
    }
  };

  const handleVideoRequest = async () => {
    if (!myProfile) return;
    if (!isTestChat && !match) return;

    try {
      if (isTestChat) {
        setTestBotVideoConsent(matchId);
        invalidateChat();
        showNotification({
          type: 'video_ready',
          title: 'Видео-встреча доступна!',
          body: `${otherProfile?.name || 'Собеседник'} согласилась — можно звонить`,
        });
        return;
      }

      const isA = match.profile_a_id === myProfile.id;
      await base44.entities.Match.update(match.id, {
        [isA ? 'video_consent_a' : 'video_consent_b']: true,
      });
      await base44.entities.Message.create({
        match_id: matchId,
        sender_profile_id: myProfile.id,
        type: 'system',
        content: '📹 Предложил(а) видео-встречу на 3 минуты',
      });
      invalidateChat();
      showNotification({
        type: 'video_request',
        title: 'Запрос видео-встречи отправлен',
        body: 'Ждём, пока собеседник согласится',
      });
    } catch {
      showNotification({ type: 'error', title: 'Ошибка', body: 'Не удалось отправить запрос' });
    }
  };

  const prevVideoUnlocked = useRef(false);
  useEffect(() => {
    if (mediaUnlocked && !prevVideoUnlocked.current) {
      showNotification({
        type: 'video_ready',
        title: 'Медиа разблокированы! 🎉',
        body: 'Теперь можно отправлять фото, голосовые и звонить без ограничения по времени',
      });
    }
    prevVideoUnlocked.current = !!mediaUnlocked;
  }, [mediaUnlocked]);

  const otherOnline = isProfileOnline(otherProfile);
  const otherPhoto = otherProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop';
  const chatReady = !!myProfile && (!!match || isTestChat);
  const isBlocked = isProfileBlocked(myProfile, otherProfile?.id);

  const handleBlockOnly = async () => {
    if (!myProfile || !otherProfile?.id) return;
    try {
      await blockUser.mutateAsync({
        myProfile,
        targetProfileId: otherProfile.id,
        matchId,
      });
      setShowReportSheet(false);
      showNotification({
        type: 'info',
        title: 'Пользователь заблокирован',
        body: 'Он больше не появится в поиске и чатах',
      });
      navigate('/chats');
    } catch {
      showNotification({ type: 'error', title: 'Ошибка', body: 'Не удалось заблокировать' });
    }
  };

  const handleSubmitReport = async ({ reasonId, details, alsoBlock }) => {
    if (!myProfile || !otherProfile) return;
    try {
      await submitReport.mutateAsync({
        myProfile,
        otherProfile,
        matchId,
        reasonId,
        details,
        alsoBlock,
      });
      setShowReportSheet(false);
      showNotification({
        type: 'info',
        title: alsoBlock ? 'Жалоба отправлена, пользователь заблокирован' : 'Жалоба отправлена',
        body: 'Спасибо — мы проверим это',
      });
      if (alsoBlock) navigate('/chats');
    } catch {
      showNotification({ type: 'error', title: 'Ошибка', body: 'Не удалось отправить жалобу' });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="glass-strong border-b border-white/5 px-3 py-3 safe-top flex items-center gap-3 z-10">
        <button type="button" onClick={() => navigate('/chats')} className="p-1.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => otherProfile && setShowProfileSheet(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="Открыть профиль"
        >
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
            <img src={otherPhoto} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{otherProfile?.name || '...'}</h2>
            <div className="flex items-center gap-1">
              {otherOnline && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
              <span className="text-xs text-muted-foreground">
                {otherOnline ? 'онлайн · профиль' : 'был(а) недавно · профиль'}
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowProfileSheet(true)}
            disabled={!otherProfile}
            className="rounded-xl p-2.5 glass disabled:opacity-50"
            aria-label="Информация о профиле"
          >
            <Info className="h-5 w-5 text-primary" />
          </button>
          <button
            type="button"
            onClick={() => setShowReportSheet(true)}
            className="p-2.5 rounded-xl glass"
            aria-label="Пожаловаться или заблокировать"
          >
            <Flag className="w-5 h-5 text-muted-foreground" />
          </button>
          {!isBlocked && (videoReady ? (
            <button
              type="button"
              onClick={() => navigate(`/video-call/${matchId}`)}
              className="p-2.5 rounded-xl gradient-primary neon-glow"
            >
              <Video className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVideoRequest}
              disabled={myConsent}
              className={`p-2.5 rounded-xl transition-all ${
                myConsent ? 'glass text-muted-foreground' : 'glass hover:bg-primary/20 text-primary'
              }`}
            >
              <Video className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {isBlocked && (
        <div className="mx-4 mt-3 glass-strong rounded-2xl p-4 text-center border border-red-500/20">
          <p className="text-sm font-medium text-red-400">Пользователь заблокирован</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Вы больше не получите сообщения от {otherProfile?.name || 'этого пользователя'}
          </p>
          <Button onClick={() => navigate('/chats')} variant="ghost" className="rounded-xl glass">
            Вернуться к чатам
          </Button>
        </div>
      )}

      {!isBlocked && theirConsent && !myConsent && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mt-3 glass-strong rounded-2xl p-4 neon-glow"
        >
          <p className="text-sm font-medium mb-2">
            📹 {otherProfile?.name} хочет видео-встречу!
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Согласись — и вы сможете созвониться на 3 минуты
          </p>
          <Button onClick={handleVideoRequest} className="w-full gradient-primary rounded-xl border-0">
            Согласиться на видео-встречу
          </Button>
        </motion.div>
      )}

      {!isBlocked && videoReady && !mediaUnlocked && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mt-3 glass-strong rounded-2xl p-4 text-center"
        >
          <p className="text-sm font-medium">🎥 Время для видео-знакомства</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Первый звонок — 3 минуты. Если оба захотите продолжить — откроются фото, голосовые и безлимитные видеозвонки
          </p>
          <Button
            onClick={() => navigate(`/video-call/${matchId}`)}
            className="gradient-primary rounded-xl border-0"
          >
            <Video className="w-4 h-4 mr-2" />
            Начать 3-минутный звонок
          </Button>
        </motion.div>
      )}

      {!isBlocked && mediaUnlocked && (
        <div className="mx-4 mt-3 glass rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-green-400">✓ Фото, голосовые и безлимитные видеозвонки</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-6 space-y-3">
        {msgsLoading || matchLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Напиши первым — начни знакомство!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_profile_id === myProfile?.id;
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="glass rounded-full px-4 py-1.5 text-xs text-muted-foreground inline-block">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${
                  isMine
                    ? 'gradient-primary rounded-2xl rounded-br-md'
                    : 'glass rounded-2xl rounded-bl-md'
                } px-4 py-2.5`}>
                  {msg.type === 'photo' ? (
                    <img src={msg.content} alt="" className="rounded-xl max-w-full max-h-64 object-cover" />
                  ) : msg.type === 'voice' ? (
                    <audio
                      controls
                      src={msg.content}
                      preload="metadata"
                      className="w-full min-w-[12rem] h-10"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    isMine ? 'text-white/60' : 'text-muted-foreground'
                  }`}>
                    <span className="text-[10px]">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </span>
                    {isMine && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {!isBlocked && (
      <div className="chat-composer glass-strong border-t border-white/5 px-3 pt-3">
        {!isBlocked && !myConsent && !videoReady && chatReady && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleVideoRequest}
            className="w-full mb-2 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
            style={{
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.3)',
              color: 'hsl(270,80%,75%)',
            }}
          >
            <Video className="w-4 h-4" />
            Предложить видео-встречу
          </motion.button>
        )}
        {myConsent && !videoReady && (
          <div className="w-full mb-2 py-2 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Clock className="w-4 h-4" />
            Запрос отправлен — ждём согласия
          </div>
        )}

        <div className="flex items-center gap-2">
          {recording ? (
            <>
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2.5 rounded-xl glass flex-shrink-0"
                aria-label="Отменить запись"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex-1 h-11 glass rounded-xl flex items-center gap-3 px-4 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span className="text-sm text-red-400 tabular-nums flex-shrink-0">
                  {formatRecordingTime(recordingSeconds)}
                </span>
                <span className="text-xs text-muted-foreground truncate">Запись...</span>
              </div>
              <button
                type="button"
                onClick={sendRecording}
                className="p-2.5 rounded-xl gradient-primary neon-glow flex-shrink-0"
                aria-label="Отправить голосовое"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </>
          ) : (
            <>
          <label className={`p-2.5 rounded-xl flex-shrink-0 ${mediaUnlocked ? 'glass cursor-pointer' : 'glass opacity-50 cursor-not-allowed'}`}>
            {mediaUnlocked ? (
              <>
                <Image className="w-5 h-5 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={sendPhoto} className="hidden" />
              </>
            ) : (
              <button type="button" onClick={notifyMediaLocked} className="block">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </label>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={chatReady ? 'Сообщение...' : 'Загрузка...'}
            disabled={!chatReady || sending}
            className="flex-1 h-11 bg-secondary border-0 rounded-xl text-sm"
          />

          {text.trim() ? (
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !chatReady}
              className="p-2.5 rounded-xl gradient-primary neon-glow flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={mediaUnlocked ? startVoiceRecording : notifyMediaLocked}
              disabled={!chatReady}
              aria-label={mediaUnlocked ? 'Голосовое сообщение' : 'Голосовые после видео-встречи'}
              className={`p-2.5 rounded-xl flex-shrink-0 disabled:opacity-50 ${
                mediaUnlocked ? 'glass' : 'glass opacity-50'
              }`}
            >
              {mediaUnlocked ? (
                <Mic className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          )}
            </>
          )}
        </div>
      </div>
      )}

      <AnimatePresence>
        {showProfileSheet && (
          <ChatProfileSheet
            open={showProfileSheet}
            onClose={() => setShowProfileSheet(false)}
            profile={otherProfile}
          />
        )}
        {showReportSheet && (
          <ReportBlockSheet
            open={showReportSheet}
            onClose={() => setShowReportSheet(false)}
            otherProfile={otherProfile}
            onSubmitReport={handleSubmitReport}
            onBlockOnly={handleBlockOnly}
            submitting={moderationBusy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
