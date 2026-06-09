/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useCurrentProfile } from '@/lib/useProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Lightbulb, Bug, Palette, MessageCircle, ArrowLeft,
  ThumbsUp, ChevronRight, Loader2, Send, Sparkles, X,
  CheckCircle2, Clock, Zap, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { showNotification } from '@/components/AppNotifications';

const categories = [
  { id: 'feature', label: 'Идея', icon: Lightbulb, color: 'text-yellow-400' },
  { id: 'bug', label: 'Баг', icon: Bug, color: 'text-red-400' },
  { id: 'design', label: 'Дизайн', icon: Palette, color: 'text-purple-400' },
  { id: 'other', label: 'Другое', icon: MessageCircle, color: 'text-blue-400' },
];

const statusConfig = {
  new: { label: 'Новое', icon: Clock, color: 'text-muted-foreground', bg: 'bg-secondary' },
  planned: { label: 'В планах', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  in_progress: { label: 'В разработке', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  done: { label: 'Готово', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
};

const suggestions = [
  'Добавьте совместимость по интересам',
  'Нужны видеосообщения',
  'Хочу скрытый режим',
  'Добавьте музыку в профиль',
];

export default function Feedback() {
  const navigate = useNavigate();
  const { data: profile } = useCurrentProfile();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'feature' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => base44.entities.Feedback.list('-votes', 50),
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        ...form,
        author_name: profile?.name || 'Аноним',
        votes: 0,
        voter_ids: [],
      });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      setSubmitted(true);
      setForm({ title: '', description: '', category: 'feature' });
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
      }, 2000);
    } catch {
      showNotification({
        type: 'error',
        title: 'Не удалось отправить',
        body: 'Попробуйте ещё раз позже',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (feedback) => {
    if (!profile) return;
    const alreadyVoted = (feedback.voter_ids || []).includes(profile.id);
    if (alreadyVoted) return;
    try {
      await base44.entities.Feedback.update(feedback.id, {
        votes: (feedback.votes || 0) + 1,
        voter_ids: [...(feedback.voter_ids || []), profile.id],
      });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      showNotification({
        type: 'info',
        title: 'Голос учтён',
        body: 'Спасибо за поддержку идеи',
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Не удалось проголосовать',
        body: 'Попробуйте ещё раз',
      });
    }
  };

  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);

  const emptyMessages = {
    all: { title: 'Пока нет предложений', body: 'Будь первым — нажми «Предложить»' },
    planned: { title: 'Ничего в планах', body: 'Идеи с голосами попадут сюда' },
    in_progress: { title: 'Сейчас ничего не делаем', body: 'Следи за обновлениями' },
    done: { title: 'Готовых пунктов пока нет', body: 'Скоро появятся первые результаты' },
  };
  const emptyState = emptyMessages[filter] || emptyMessages.all;

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 glass rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Идеи и баги</h1>
            <p className="text-xs text-muted-foreground">3Minutes создаётся вместе с вами</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="gradient-primary border-0 rounded-xl neon-glow"
        >
          <Plus className="w-4 h-4 mr-1" />
          Предложить
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'planned', 'in_progress', 'done'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filter === s ? 'gradient-primary text-white' : 'glass text-muted-foreground'
              }`}
            >
              {s === 'all' ? 'Все' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-lg" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10 w-full max-w-lg glass-strong rounded-t-3xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Предложить идею</h2>
                <button onClick={() => setShowForm(false)} className="glass p-2 rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-3" />
                  <h3 className="font-bold text-lg">Отправлено!</h3>
                  <p className="text-muted-foreground text-sm">Спасибо за идею 🙏</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Category */}
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                          form.category === cat.id ? 'glass-strong border border-primary/30' : 'glass'
                        }`}
                      >
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        <span className="text-[10px]">{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Quick suggestions */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Быстрые идеи:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => setForm(f => ({ ...f, title: s }))}
                          className="text-[10px] glass px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Кратко опиши идею..."
                    className="h-11 bg-secondary border-0 rounded-xl"
                  />
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Подробнее (необязательно)..."
                    className="w-full h-20 bg-secondary rounded-xl px-4 py-3 text-sm border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!form.title.trim() || submitting}
                    className="w-full gradient-primary border-0 rounded-xl h-12"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><Send className="w-4 h-4 mr-2" />Отправить</>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback list */}
      <div className="px-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 glass rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">{emptyState.title}</p>
            <p className="text-muted-foreground text-sm">{emptyState.body}</p>
          </div>
        ) : (
          filtered.map((fb, i) => {
            const st = statusConfig[fb.status] || statusConfig.new;
            const CatIcon = categories.find(c => c.id === fb.category)?.icon || Lightbulb;
            const catColor = categories.find(c => c.id === fb.category)?.color || 'text-yellow-400';
            const alreadyVoted = (fb.voter_ids || []).includes(profile?.id);

            return (
              <motion.div
                key={fb.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <CatIcon className={`w-5 h-5 ${catColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm">{fb.title}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    {fb.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{fb.description}</p>
                    )}
                    {fb.admin_reply && (
                      <div className="glass rounded-xl px-3 py-2 mb-2">
                        <p className="text-xs text-primary font-medium mb-0.5">Ответ команды:</p>
                        <p className="text-xs text-muted-foreground">{fb.admin_reply}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {fb.author_name} · {format(new Date(fb.created_date), 'd MMM', { locale: ru })}
                      </span>
                      <button
                        onClick={() => handleVote(fb)}
                        disabled={alreadyVoted}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                          alreadyVoted
                            ? 'text-primary bg-primary/10'
                            : 'glass hover:bg-primary/10 hover:text-primary text-muted-foreground'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {fb.votes || 0}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}