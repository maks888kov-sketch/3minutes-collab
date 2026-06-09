/* b44-full-sync 2026-06-01 */
/** Временные боты для локального тестирования свайпов/матчей/чатов */

export function isTestBotsEnabled() {
  if (import.meta.env.VITE_ENABLE_TEST_BOTS === 'false') return false;
  // Beta: боты включены и на опубликованном сайте, пока мало реальных анкет
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_BOTS === 'true' || import.meta.env.PROD;
}

export const TEST_BOT_PREFIX = 'test-bot-';
export const TEST_MATCH_PREFIX = 'test-match-';

export function isTestBotId(id) {
  return typeof id === 'string' && id.startsWith(TEST_BOT_PREFIX);
}

export function isTestBotMatchId(id) {
  return typeof id === 'string' && id.startsWith(TEST_MATCH_PREFIX);
}

export function getTestBotProfile(id) {
  return TEST_BOT_PROFILES.find((p) => p.id === id) || null;
}

export function buildTestMatchId(botId) {
  return `${TEST_MATCH_PREFIX}${botId}`;
}

/** willMatchBack — при лайке сразу взаимный матч */
export const TEST_BOT_PROFILES = [
  {
    id: 'test-bot-1',
    name: 'Алина',
    age: 24,
    city: 'Москва',
    gender: 'female',
    goal: 'relationship',
    is_online: true,
    is_verified: true,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1200&fit=crop',
    ],
    bio: 'Люблю кофе, путешествия и разговоры допоздна',
    interests: ['✈️ Путешествия', '🎬 Кино', '🧘 Йога'],
  },
  {
    id: 'test-bot-2',
    name: 'Катя',
    age: 22,
    city: 'Санкт-Петербург',
    gender: 'female',
    goal: 'chat',
    is_online: false,
    is_verified: false,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop'],
    bio: 'Художница. Рисую акварелью и мечтаю о Японии',
    interests: ['🎨 Искусство', '🎵 Музыка', '📚 Книги'],
  },
  {
    id: 'test-bot-3',
    name: 'Маша',
    age: 26,
    city: 'Екатеринбург',
    gender: 'female',
    goal: 'friendship',
    is_online: true,
    is_verified: true,
    is_premium: true,
    profile_complete: true,
    willMatchBack: true,
    photos: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop'],
    bio: 'Бегаю по выходным и готовлю по воскресеньям',
    interests: ['🏋️ Спорт', '🍳 Кулинария', '🌿 Природа'],
  },
  {
    id: 'test-bot-4',
    name: 'Юля',
    age: 23,
    city: 'Казань',
    gender: 'female',
    goal: 'relationship',
    is_online: false,
    is_verified: false,
    is_premium: false,
    profile_complete: true,
    willMatchBack: false,
    photos: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1200&fit=crop',
    ],
    bio: 'Разработчик днём, геймер ночью',
    interests: ['🎮 Игры', '🎬 Кино', '🎵 Музыка'],
  },
  {
    id: 'test-bot-5',
    name: 'Вика',
    age: 25,
    city: 'Новосибирск',
    gender: 'female',
    goal: 'networking',
    is_online: true,
    is_verified: true,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: [
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1200&fit=crop',
    ],
    photo_slides: [
      {
        showName: true,
        tags: [{ emoji: '💼', label: 'Нетворкинг' }, { emoji: '📍', label: 'Новосибирск' }],
        text: 'Фотограф. Карелия — моя любовь',
      },
      {
        showName: false,
        tags: [{ emoji: '📸', label: 'Фото' }, { emoji: '🌿', label: 'Природа' }, { emoji: '✈️', label: 'Путешествия' }],
        text: 'Снимаю портреты и пейзажи на плёнку',
      },
      {
        showName: true,
        tags: [{ emoji: '📸', label: 'Фото' }, { emoji: '🎨', label: 'Искусство' }],
        text: 'Ищу компанию для поездок и фотопрогулок по городу',
      },
    ],
    bio: 'Фотограф. Карелия — моя любовь',
    interests: ['📸 Фото', '🌿 Природа', '✈️ Путешествия'],
  },
  {
    id: 'test-bot-6',
    name: 'Даша',
    age: 21,
    city: 'Краснодар',
    gender: 'female',
    goal: 'chat',
    is_online: false,
    is_verified: false,
    is_premium: false,
    profile_complete: true,
    willMatchBack: false,
    photos: ['https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=800&fit=crop'],
    bio: 'Танцую и учусь петь. Музыка — это всё',
    interests: ['💃 Танцы', '🎵 Музыка', '🎨 Искусство'],
  },
  {
    id: 'test-bot-7',
    name: 'Соня',
    age: 27,
    city: 'Москва',
    gender: 'female',
    goal: 'relationship',
    is_online: true,
    is_verified: true,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: [
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1524502397800-2eeaad7dc3fe?w=800&h=1200&fit=crop',
    ],
    bio: 'Подкасты, велосипед и specialty coffee',
    interests: ['☕ Кофе', '🏃 Бег', '📚 Книги'],
  },
  {
    id: 'test-bot-8',
    name: 'Лера',
    age: 28,
    city: 'Сочи',
    gender: 'female',
    goal: 'friendship',
    is_online: true,
    is_verified: false,
    is_premium: false,
    profile_complete: true,
    willMatchBack: false,
    photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop'],
    bio: 'Живу у моря, катаюсь на доске и ищу компанию для прогулок',
    interests: ['🌿 Природа', '📸 Фото', '☕ Кофе'],
  },
  {
    id: 'test-bot-9',
    name: 'Настя',
    age: 23,
    city: 'Москва',
    gender: 'female',
    goal: 'relationship',
    is_online: true,
    is_verified: true,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: ['https://images.unsplash.com/photo-1524502397800-2eeaad7dc3fe?w=600&h=800&fit=crop'],
    bio: 'Маркетолог, обожаю brunch и долгие прогулки по городу',
    interests: ['☕ Кофе', '🎬 Кино', '✈️ Путешествия'],
  },
  {
    id: 'test-bot-10',
    name: 'Полина',
    age: 25,
    city: 'Санкт-Петербург',
    gender: 'female',
    goal: 'chat',
    is_online: false,
    is_verified: false,
    is_premium: false,
    profile_complete: true,
    willMatchBack: true,
    photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop'],
    bio: 'UX-дизайнер. Рисую скетчи, пью матчу и смотрю сериалы',
    interests: ['🎨 Искусство', '📚 Книги', '🎵 Музыка'],
  },
];

const BOT_REPLIES = [
  'Привет! Рада match 😊',
  'О, классно! Как дела?',
  'Давай познакомимся поближе',
  'Чем занимаешься сегодня?',
  'Звучит интересно!',
];

export function pickBotReply() {
  return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
}
