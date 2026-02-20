import React, { useState } from 'react';
import { GlassCard, Button } from './ui/GlassCard';
import { repo } from '../services/repository';
import { X, Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, ChestType, ACHIEVEMENTS_LIST } from '../types';

interface Props {
  profile: UserProfile;
  onClose: () => void;
  onRefresh: () => void;
}

export const DevMenuModal: React.FC<Props> = ({ profile, onClose, onRefresh }) => {
  // Безопасная инициализация: если данных нет, ставим 0 или пустой массив
  const [coins, setCoins] = useState(profile?.coins || 0);
  const [xp, setXp] = useState(profile?.xp || 0);
  const [dailyXp, setDailyXp] = useState(profile?.daily_xp || 0);
  const [hasFreeze, setHasFreeze] = useState(!!profile?.has_freeze);
  const [goldenDay, setGoldenDay] = useState(!!(profile?.golden_hour_expires && profile.golden_hour_expires > Date.now()));
  const [chests, setChests] = useState<ChestType[]>(Array.isArray(profile?.chest_inventory) ? [...profile.chest_inventory] : []);
// Подтягиваем текущие ачивки
  const [achievements, setAchievements] = useState<Record<string, string>>(repo.getData().achievements || {});

  // Функция для переключения (выдать/забрать)
  const handleToggleAchievement = (code: string) => {
    setAchievements(prev => {
      const updated = { ...prev };
      if (updated[code]) {
        delete updated[code]; // Забираем ачивку
      } else {
        updated[code] = new Date().toISOString().split('T')[0]; // Выдаем (ставим текущую дату)
      }
      return updated;
    });
  };
  const handleSave = () => {
    repo.updateProfile({
      coins,
      xp,
      daily_xp: dailyXp,
      has_freeze: hasFreeze,
      chest_inventory: chests,
      golden_hour_expires: goldenDay ? Date.now() + (24 * 60 * 60 * 1000) : null
    });
    
    // Сохраняем измененные достижения
    repo.setAchievements(achievements);
    
    toast.success('Чит-коды применены! 👨‍💻');
    onRefresh();
    onClose();
  };

  const addChest = (type: ChestType) => setChests(prev => [...prev, type]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-md bg-slate-900 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <Settings size={20} /> DEV MENU
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {/* Валюта и Опыт */}
          <div className="space-y-3 p-3 bg-slate-950/50 rounded-xl border border-white/5">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Золотые монеты</label>
              <input type="number" value={coins} onChange={(e) => setCoins(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Опыт (XP) - Влияет на ранг</label>
              <input type="number" value={xp} onChange={(e) => setXp(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Дневной лут (XP)</label>
              <input type="number" value={dailyXp} onChange={(e) => setDailyXp(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-cyan-500" />
            </div>
          </div>

          {/* Предметы */}
          <div className="flex justify-between p-3 bg-slate-950/50 rounded-xl border border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasFreeze} onChange={(e) => setHasFreeze(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
              <span className="text-sm font-medium text-white">Заморозка</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={goldenDay} onChange={(e) => setGoldenDay(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm font-medium text-white">Золотой день</span>
            </label>
          </div>

{/* Достижения */}
          <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5">
            <label className="text-xs text-slate-500 uppercase font-bold block mb-3">Достижения</label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
              {ACHIEVEMENTS_LIST.map(ach => {
                const hasAch = !!achievements[ach.code];
                return (
                  <label key={ach.code} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5 cursor-pointer hover:bg-slate-800 transition-colors">
                    <div>
                        <div className="text-sm font-bold text-white">{ach.name}</div>
                        <div className="text-[10px] text-slate-500">{ach.desc}</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={hasAch} 
                      onChange={() => handleToggleAchievement(ach.code)} 
                      className="w-4 h-4 accent-cyan-500 ml-3" 
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Сундуки */}
          <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-slate-500 uppercase font-bold">Сундуки ({chests.length})</label>
                <button onClick={() => setChests([])} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Trash2 size={12} /> Очистить
                </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => addChest(ChestType.COMMON)} className="flex-1 text-[10px] px-0 bg-amber-900/30 text-amber-400 border-amber-500/30 hover:bg-amber-900/50"><Plus size={12}/> Обычн</Button>
              <Button variant="secondary" onClick={() => addChest(ChestType.RARE)} className="flex-1 text-[10px] px-0 bg-blue-900/30 text-blue-400 border-blue-500/30 hover:bg-blue-900/50"><Plus size={12}/> Редкий</Button>
              <Button variant="secondary" onClick={() => addChest(ChestType.EPIC)} className="flex-1 text-[10px] px-0 bg-purple-900/30 text-purple-400 border-purple-500/30 hover:bg-purple-900/50"><Plus size={12}/> Эпик</Button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Отмена</Button>
          <Button variant="primary" onClick={handleSave} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white border-none shadow-lg">Применить</Button>
        </div>
      </GlassCard>
    </div>
  );
};