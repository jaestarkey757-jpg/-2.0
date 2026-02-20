import React, { useState } from 'react';
import { LayoutDashboard, Apple, Dumbbell, Grid, User, ShoppingBag, PackageOpen, Package } from 'lucide-react';
import { UserProfile, RANKS } from '../types';

interface SidebarProps {
  currentTab: number;
  onSwitch: (idx: number) => void;
  onProfileClick: () => void;
  profile: UserProfile;
  onSecretClick: () => void;
}

const NAV_ITEMS = [
  { label: 'Задачи', icon: LayoutDashboard },
  { label: 'Калории', icon: Apple },
  { label: 'Спорт', icon: Dumbbell },
  { label: 'Привычки', icon: Grid },
  { label: 'Магазин', icon: ShoppingBag },
  { label: 'Инвентарь', icon: PackageOpen },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSwitch, onProfileClick, profile, onSecretClick }) => {
  const currentRank = RANKS.reduce((prev, curr) => (profile.xp >= curr.threshold ? curr : prev), RANKS[0]);
  const chestCount = profile.chest_inventory.length;

  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    setClickCount(prev => {
        const next = prev + 1;
        if (next >= 5) {
            onSecretClick();
            return 0; // Сбрасываем счетчик после открытия
        }
        return next;
    });
  };

  return (
    <div className="w-64 bg-slate-900/80 border-r border-white/5 flex flex-col h-full sticky top-0">
      <div className="pt-2 pb-0 px-4 flex flex-col items-center text-center overflow-hidden shrink-0">
        <img 
            src="/Massonabor.png" 
            alt="Massonabor" 
            className="w-full max-w-[200px] h-auto object-contain -my-6 scale-110 pointer-events-none" 
        />
        <p 
          onClick={handleSecretClick} 
          className="text-[10px] text-yellow-500/60 -mt-2 mb-8 uppercase tracking-[0.2em] font-semibold relative z-50 cursor-pointer select-none py-2 px-4"
        >
          Beta 1.2
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item, idx) => {
          const isActive = currentTab === idx;
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSwitch(idx)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-500 rounded-r-none' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              {item.label}
              
              {/* Бейджик для инвентаря */}
              {idx === 5 && chestCount > 0 && (
                  <span className="ml-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse">
                      {chestCount}
                  </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* --- DAILY XP PROGRESS BAR (LUXURY) --- */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-4 border border-white/10 relative overflow-visible shadow-[0_4px_20px_rgba(0,0,0,0.3)] group">
          
          {/* Свечение на фоне */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full group-hover:bg-cyan-500/20 transition-colors pointer-events-none"></div>

          <div className="flex justify-between items-end mb-3 relative z-10">
            <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-1.5 uppercase tracking-widest drop-shadow-sm">
               <Package size={14} className="text-cyan-400" /> Дневной лут
            </span>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-500/20">
              {profile.daily_xp} XP
            </span>
          </div>
          
          <div className="relative h-2 w-full bg-slate-900 rounded-full overflow-visible border border-white/5 shadow-inner mt-2">
            
            {/* Полоса прогресса с собственным свечением */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (profile.daily_xp / 600) * 100)}%` }}
              />
            </div>
            
            {/* Checkpoint 1 (Обычный) */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-[16.6%] w-2.5 h-2.5 rounded-full border border-slate-900 z-10 group/tooltip cursor-help transition-all duration-300 hover:scale-150 flex items-center justify-center ${profile.daily_xp >= 100 ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-700'}`}>
               <div className="absolute bottom-full mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity bg-slate-800 text-amber-400 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/30 whitespace-nowrap z-50 pointer-events-none shadow-xl">
                  Обычный: {Math.min(profile.daily_xp, 100)} / 100
               </div>
            </div>

            {/* Checkpoint 2 (Редкий) */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-[50%] w-2.5 h-2.5 rounded-full border border-slate-900 z-10 group/tooltip cursor-help transition-all duration-300 hover:scale-150 flex items-center justify-center ${profile.daily_xp >= 300 ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-slate-700'}`}>
               <div className="absolute bottom-full mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity bg-slate-800 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/30 whitespace-nowrap z-50 pointer-events-none shadow-xl">
                  Редкий: {Math.min(profile.daily_xp, 300)} / 300
               </div>
            </div>

            {/* Checkpoint 3 (Эпический) */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 translate-x-[2px] w-3 h-3 rounded-full border-2 border-slate-900 z-10 group/tooltip cursor-help transition-all duration-300 hover:scale-150 flex items-center justify-center ${profile.daily_xp >= 600 ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 'bg-slate-700'}`}>
               <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover/tooltip:opacity-100 transition-opacity bg-slate-800 text-purple-400 text-[10px] font-bold px-2 py-1 rounded border border-purple-500/30 whitespace-nowrap z-50 pointer-events-none shadow-xl">
                  Эпик: {Math.min(profile.daily_xp, 600)} / 600
               </div>
            </div>
          </div>
          
          {/* Подписи под чекпоинтами */}
          <div className="flex justify-between mt-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest relative z-10">
             <span>Обычн</span>
             <span className="ml-5">Редк</span>
             <span>Эпик</span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 shrink-0">
        <div 
            onClick={onProfileClick}
            className="bg-slate-950/50 rounded-xl p-4 border border-white/5 cursor-pointer group hover:bg-slate-900 transition-colors relative overflow-hidden"
        >
          <div className="text-center mb-2 relative z-10">
            <span className={`font-bold text-sm block bg-gradient-to-r ${currentRank.color} bg-clip-text text-transparent`}>
                {currentRank.title}
            </span>
            <span className="text-slate-500 text-xs">{profile.xp} XP | 🪙 {profile.coins}</span>
          </div>
          <div className="flex justify-center relative z-10">
             <div className={`w-14 h-14 rounded-full p-[2px] bg-gradient-to-br ${currentRank.color} shadow-lg shadow-black/50`}>
                 <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden flex items-center justify-center relative">
                    {profile.avatar_path ? (
                      <img src={profile.avatar_path} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-slate-500" size={24} />
                    )}
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};