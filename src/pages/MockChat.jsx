/* b44-full-sync 2026-06-01 */
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, ImageIcon, Video, CheckCheck, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MOCK_PROFILES, MOCK_CONVERSATIONS } from '@/lib/mockChats';

// Video states: idle -> requested -> partner_agreed -> unlocked
const VIDEO_STATES = {
  idle: 'idle',
  requested: 'requested',
  partner_agreed: 'partner_agreed',
  unlocked: 'unlocked',
};

export default function MockChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const profile = MOCK_PROFILES.find(p => p.id === chatId);
  const initialMsgs = (MOCK_CONVERSATIONS[chatId] || []).map(m => ({ ...m }));

  const [messages, setMessages] = useState(initialMsgs);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [videoState, setVideoState] = useState(
    // if mock-2, pre-seed with partner requesting
    chatId === 'mock-2' ? VIDEO_STATES.partner_agreed : VIDEO_STATES.idle
  );
  const scrollRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simulate partner typing after user sends
  const simulateReply = () => {
    const replies = [
      'Интересно! 😊',
      'Расскажи подробнее',
      'Полностью согласна!',
      'Хм, не думала об этом...',
      'А ты как к этому относишься?',
      '😂 Серьёзно?!',
      'Звучит классно!',
      'Вот это да! Надо попробовать',
    ];
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: `auto-${Date.now()}`,
          sender: 'them',
          type: 'text',
          content: replies[Math.floor(Math.random() * replies.length)],
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 1500 + Math.random() * 1500);
    }, 800);
  };

  const sendMessage = () => {
    if (!text.trim()) return;
    const msg = {
      id: `me-${Date.now()}`,
      sender: 'me',
      type: 'text',
      content: text.trim(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
    setText('');
    simulateReply();
  };

  const handleVideoRequest = () => {
    if (videoState === VIDEO_STATES.idle) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        sender: 'me',
        type: 'system',
        content: '📹 Вы предложили видео-встречу на 3 минуты',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setVideoState(VIDEO_STATES.requested);
      // Auto-accept after 3 seconds (mock)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `sys2-${Date.now()}`,
          sender: 'system',
          type: 'system',
          content: `✅ ${profile?.name} согласилась на видео-встречу 🎉`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setVideoState(VIDEO_STATES.unlocked);
      }, 3000);
    }
  };

  const acceptVideoRequest = () => {
    setMessages(prev => [...prev, {
      id: `sys-acc-${Date.now()}`,
      sender: 'system',
      type: 'system',
      content: '🎉 Оба согласились! Видео-встреча доступна',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setVideoState(VIDEO_STATES.unlocked);
  };

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Чат не найден</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="glass-strong border-b border-white/5 px-3 py-3 safe-top flex items-center gap-3 z-10">
        <button onClick={() => navigate('/chats')} className="p-1.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={profile.photos?.[0]} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          {profile.is_online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">{profile.name}, {profile.age}</h2>
          <p className="text-xs text-muted-foreground">
            {profile.is_online ? (
              <span className="text-green-400">онлайн</span>
            ) : 'был(а) недавно'}
          </p>
        </div>
        {/* Video button in header */}
        {videoState === VIDEO_STATES.unlocked ? (
          <button
            onClick={() => navigate(`/video-call/${chatId}`)}
            className="p-2.5 rounded-xl gradient-primary neon-glow"
          >
            <Video className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={handleVideoRequest}
            disabled={videoState === VIDEO_STATES.requested}
            className={`p-2.5 rounded-xl transition-all ${
              videoState === VIDEO_STATES.requested
                ? 'glass text-muted-foreground opacity-50'
                : 'glass hover:bg-primary/20 text-primary'
            }`}
          >
            <Video className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Partner asking for video banner */}
      {videoState === VIDEO_STATES.partner_agreed && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mt-3 glass-strong rounded-2xl p-4 neon-glow"
        >
          <p className="text-sm font-medium mb-1">📹 {profile.name} хочет видео-встречу!</p>
          <p className="text-xs text-muted-foreground mb-3">Согласись — и вы сможете созвониться на 3 минуты</p>
          <Button onClick={acceptVideoRequest} className="w-full gradient-primary rounded-xl border-0">
            Согласиться на видео-встречу
          </Button>
        </motion.div>
      )}

      {/* Unlocked banner */}
      <AnimatePresence>
        {videoState === VIDEO_STATES.unlocked && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="mx-4 mt-3 glass-strong rounded-2xl p-4 neon-glow-pink text-center"
          >
            <p className="text-sm font-medium mb-2">🎉 Видео-встреча разблокирована!</p>
            <Button onClick={() => navigate(`/video-call/${chatId}`)} className="gradient-primary rounded-xl border-0">
              <Video className="w-4 h-4 mr-2" />
              Начать 3-минутный звонок
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="glass rounded-full px-4 py-1.5 text-xs text-muted-foreground inline-block">
                  {msg.content}
                </span>
              </div>
            );
          }
          const isMine = msg.sender === 'me';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${
                isMine ? 'gradient-primary rounded-2xl rounded-br-md' : 'glass rounded-2xl rounded-bl-md'
              } px-4 py-2.5`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${
                  isMine ? 'text-white/60' : 'text-muted-foreground'
                }`}>
                  <span className="text-[10px]">{msg.time}</span>
                  {isMine && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex justify-start"
            >
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="glass-strong border-t border-white/5 px-3 pt-2 pb-3 safe-bottom">
        {/* Video CTA in input area */}
        {videoState === VIDEO_STATES.idle && (
          <motion.button
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
        {videoState === VIDEO_STATES.requested && (
          <div className="w-full mb-2 py-2 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Clock className="w-4 h-4" />
            Запрос отправлен — ждём согласия
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl glass flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Сообщение..."
            className="flex-1 h-11 bg-secondary border-0 rounded-xl text-sm"
          />
          {text.trim() ? (
            <button onClick={sendMessage} className="p-2.5 rounded-xl gradient-primary neon-glow flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button className="p-2.5 rounded-xl glass flex-shrink-0">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}