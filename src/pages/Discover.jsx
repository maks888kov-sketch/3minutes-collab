/* b44-full-sync 2026-06-01 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentProfile, useDiscoverProfiles, useOnlineCount } from '@/lib/useProfile';
import { showNotification } from '@/components/AppNotifications';
import SwipeCard from '@/components/SwipeCard';
import DiscoverCardCaption from '@/components/discover/DiscoverCardCaption';
import MatchPopup from '@/components/MatchPopup';
import DailyPicks from '@/components/DailyPicks';
import DiscoverFiltersSheet from '@/components/discover/DiscoverFiltersSheet';
import DiscoverSkeleton from '@/components/DiscoverSkeleton';
import { countActiveFilters, getFilterSummary } from '@/lib/discoverFilters';
import { isTestBotId, isTestBotsEnabled, TEST_BOT_PROFILES } from '@/lib/testBots';
import { recordTestBotSwipe, resetTestBotState } from '@/lib/testBotStore';
import { Heart, X, Star, Sparkles, Flame, RefreshCw, SlidersHorizontal } from 'lucide-react';
export default function Discover() {
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const { data: discoverData, isLoading, refetch } = useDiscoverProfiles(profile);
  const profiles = discoverData?.profiles ?? [];
  const poolSize = discoverData?.poolSize ?? 0;
  const { data: onlineCount = 0 } = useOnlineCount();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captionPhotoIndex, setCaptionPhotoIndex] = useState(0);
  const [matchPopup, setMatchPopup] = useState(null);
  const [showDailyPicks, setShowDailyPicks] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const queryClient = useQueryClient();

  const activeFilters = countActiveFilters(profile);
  const filtersTooStrict = poolSize > 0 && profiles.length === 0;

  useEffect(() => {
    setCurrentIndex(0);
  }, [
    profile?.min_age_filter,
    profile?.max_age_filter,
    profile?.city_filter,
    profile?.looking_for,
  ]);

  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      setCurrentIndex(0);
    }
  }, [profiles.length, currentIndex]);

  useEffect(() => {
    setCaptionPhotoIndex(0);
  }, [profiles[currentIndex]?.id]);

  const handleRefresh = useCallback(async () => {
    setPullRefreshing(true);
    await refetch();
    setCurrentIndex(0);
    setTimeout(() => setPullRefreshing(false), 600);
  }, [refetch]);

  // Pull-to-refresh
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && currentIndex === 0) handleRefresh();
  };

  const handleSwipe = useCallback(async (direction, options = {}) => {
    const targetProfile = options.targetProfile || profiles[currentIndex];
    if (!targetProfile || !profile) return;

    const isLike = direction === 'right' || direction === 'super';
    const isSuperLike = direction === 'super' || options.superLike;

    if (isTestBotId(targetProfile.id)) {
      const result = recordTestBotSwipe(profile.id, targetProfile.id, direction, { superLike: isSuperLike });

      if (isSuperLike) {
        showNotification({
          type: 'match',
          title: 'Суперлайк отправлен ⭐',
          body: `${targetProfile.name} увидит, что вы заинтересованы`,
        });
      }

      if (result.matched && result.match) {
        setMatchPopup({ match: result.match, otherProfile: targetProfile });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['chatList'] });
      } else if (isLike) {
        showNotification({
          type: 'info',
          title: 'Лайк отправлен',
          body: `${targetProfile.name} увидит твою симпатию`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['discover'] });

      if (options.targetProfile) {
        setCurrentIndex((prev) => Math.max(prev, profiles.findIndex((p) => p.id === targetProfile.id) + 1));
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
      return;
    }

    await base44.entities.Like.create({
      from_profile_id: profile.id,
      to_profile_id: targetProfile.id,
      is_like: isLike,
      is_super_like: !!isSuperLike,
    });

    if (isSuperLike) {
      showNotification({
        type: 'match',
        title: 'Суперлайк отправлен ⭐',
        body: `${targetProfile.name} увидит, что вы заинтересованы`,
      });
    }

    if (isLike) {
      const reverseL = await base44.entities.Like.filter({
        from_profile_id: targetProfile.id,
        to_profile_id: profile.id,
        is_like: true,
      });

      if (reverseL.length > 0) {
        const match = await base44.entities.Match.create({
          profile_a_id: profile.id,
          profile_b_id: targetProfile.id,
          status: 'active',
        });
        setMatchPopup({ match, otherProfile: targetProfile });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['chatList'] });
      }
    }

    if (options.targetProfile) {
      setCurrentIndex((prev) => Math.max(prev, profiles.findIndex((p) => p.id === targetProfile.id) + 1));
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [profiles, currentIndex, profile, queryClient]);

  if (profileLoading || isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden safe-top relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
        </div>
        <div className="relative z-20 flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold gradient-text">3Minutes</h1>
          </div>
        </div>
        <div className="discover-feed-zone relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[5.25rem]">
          <div className="discover-card-frame">
            <div className="absolute inset-0">
              <DiscoverSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const remaining = profiles.slice(currentIndex);
  const topProfile = remaining[0];
  const testBotsInFeed = remaining.filter((p) => isTestBotId(p.id)).length;
  const testBotsMatchBackCount = TEST_BOT_PROFILES.filter((b) => b.willMatchBack).length;

  const handleResetTestBots = () => {
    if (!profile?.id) return;
    resetTestBotState(profile.id);
    setCurrentIndex(0);
    queryClient.invalidateQueries({ queryKey: ['discover'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['chatList'] });
    showNotification({
      type: 'info',
      title: 'Тест-боты сброшены',
      body: 'Можно снова листать и проверять матчи',
    });
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden safe-top relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full glass"
          >
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Обновление...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-20 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold gradient-text sm:text-xl">3Minutes</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="relative flex items-center gap-1.5 glass rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Фильтры</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}>
                {activeFilters}
              </span>
            )}
          </button>
          <span className="text-[10px] font-medium text-green-400 sm:hidden">{onlineCount} онл.</span>
          <div className="hidden items-center gap-1.5 glass rounded-xl px-3 py-2 sm:flex">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-400">{onlineCount} онлайн</span>
          </div>
          <button
            onClick={() => setShowDailyPicks(true)}
            className="hidden items-center gap-1.5 glass rounded-xl px-3 py-2 sm:flex"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Подбор</span>
          </button>
        </div>
      </div>

      {activeFilters > 0 && (
        <div className="relative z-20 mb-1 flex-shrink-0 px-5">
          <button
            onClick={() => setShowFilters(true)}
            className="text-xs text-muted-foreground glass rounded-full px-3 py-1.5 hover:text-foreground transition-colors"
          >
            {getFilterSummary(profile)}
          </button>
        </div>
      )}

      {isTestBotsEnabled() && (
        <div className="relative z-20 mb-1 flex-shrink-0 px-5">
          <div className="flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-[10px] glass">
            <span className="text-muted-foreground truncate">
              🤖 Тест-боты · {testBotsInFeed > 0 ? `${testBotsInFeed} в ленте` : 'включены'}
            </span>
            <button
              type="button"
              onClick={handleResetTestBots}
              className="flex-shrink-0 text-primary hover:underline"
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="discover-feed-zone relative flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-[5.25rem]">
        {remaining.length === 0 ? (
          <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
                style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6), transparent 70%)' }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                {filtersTooStrict ? (
                  <SlidersHorizontal className="w-12 h-12 text-primary" />
                ) : (
                  <Heart className="w-12 h-12 text-primary" />
                )}
              </div>
            </motion.div>
            <div>
              {filtersTooStrict ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">Никто не подходит</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Под текущие фильтры никто не попадает.<br />
                    Ослабь возраст, город или «кого показывать».
                  </p>
                </>
              ) : currentIndex > 0 ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">Пока всё</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Ты просмотрел всех по текущим фильтрам.<br />
                    Загляни позже — новые люди появятся скоро!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">Пока никого нет</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    В приложении пока мало анкет.<br />
                    Загляни позже — новые люди появятся скоро!
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {filtersTooStrict && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white w-full"
                  style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Изменить фильтры
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm w-full ${
                  filtersTooStrict
                    ? 'glass text-foreground'
                    : 'text-white'
                }`}
                style={filtersTooStrict ? undefined : { background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
              >
                <RefreshCw className="w-4 h-4" />
                Обновить рекомендации
              </motion.button>
              {isTestBotsEnabled() && currentIndex > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleResetTestBots}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold glass text-foreground"
                >
                  Вернуть тест-ботов в ленту
                </motion.button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-md min-h-0 flex-1 flex-col items-center justify-center gap-2">
            <div className="discover-card-frame relative w-full shrink-0">
              <motion.div
                className="absolute inset-0 z-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {remaining.slice(0, 3).reverse().map((p, i, arr) => (
                  <SwipeCard
                    key={p.id}
                    profile={p}
                    isTop={i === arr.length - 1}
                    onSwipe={handleSwipe}
                    infoPlacement="photo-only"
                    photoIndex={i === arr.length - 1 ? captionPhotoIndex : 0}
                    onPhotoIndexChange={i === arr.length - 1 ? setCaptionPhotoIndex : undefined}
                  />
                ))}
              </motion.div>
            </div>

            <DiscoverCardCaption profile={topProfile} photoIndex={captionPhotoIndex} />

            <div className="flex w-full items-center justify-center gap-4 px-4 py-1">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => handleSwipe('left')}
                className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-[#3a3a3a]/90 shadow-lg"
              >
                <X className="h-6 w-6 text-white" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => handleSwipe('super')}
                className="flex h-[3.25rem] w-[4.5rem] items-center justify-center rounded-full bg-[#c9a87c] shadow-lg"
              >
                <Star className="h-6 w-6 text-white" fill="white" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => handleSwipe('right')}
                className="flex h-[3.25rem] w-[4.5rem] items-center justify-center rounded-full bg-white shadow-lg"
              >
                <Heart className="h-6 w-6 text-black" fill="black" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Match Popup */}
      <AnimatePresence>
        {matchPopup && (
          <MatchPopup
            match={matchPopup.match}
            otherProfile={matchPopup.otherProfile}
            myProfile={profile}
            onClose={() => setMatchPopup(null)}
          />
        )}
      </AnimatePresence>

      {/* Filters Sheet */}
      <AnimatePresence>
        {showFilters && (
          <DiscoverFiltersSheet
            profile={profile}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Daily Picks */}
      <AnimatePresence>
        {showDailyPicks && (
          <DailyPicks profiles={profiles} onClose={() => setShowDailyPicks(false)} onSwipe={(p, dir) => {
            handleSwipe(dir, { targetProfile: p });
            setShowDailyPicks(false);
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}