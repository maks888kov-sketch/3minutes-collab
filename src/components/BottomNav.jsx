/* b44-full-sync 2026-06-01 */
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, MessageCircle, Heart, User, Crown } from 'lucide-react';

const navItems = [
  { path: '/discover', icon: Flame, label: 'Поиск' },
  { path: '/matches', icon: Heart, label: 'Пары' },
  { path: '/chats', icon: MessageCircle, label: 'Чаты' },
  { path: '/premium', icon: Crown, label: 'Premium' },
  { path: '/settings', icon: User, label: 'Профиль' },
];


export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-[#0d0b14]">
      <div className="glass-strong border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-0"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-8 h-0.5 rounded-full gradient-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className={`text-[10px] transition-colors duration-200 ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}