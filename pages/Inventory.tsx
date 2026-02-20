import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '../components/Experience';
import { AppState, ChestType, Reward, RewardType, UserProfile } from '../types';
import { useGameSounds } from '../hooks/useGameSounds';
import { repo } from '../services/repository';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { Coins, Snowflake, Zap, PackageOpen, Shield, X, Timer, Utensils, Flame, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  profile: UserProfile;
  onRefresh: () => void;
}

// Тип для купленных наград
export interface ActiveReward {
    id: string;
    name: string;
    category: 'food' | 'dopamine';
    expiresAt: number; // Timestamp времени сгорания
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const getGaussianRandom = (min: number, max: number) => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); 
  while(v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6; 
  let result = mean + num * stdDev;
  return Math.floor(Math.max(min, Math.min(max, result)));
};

// --- CSS-Арт Полноценных Сундуков ---
const ChestGraphic: React.FC<{ type: ChestType }> = ({ type }) => {
    const styles = {
        [ChestType.COMMON]: { 
            bg: 'bg-gradient-to-b from-amber-700 to-amber-900', 
            trim: 'bg-gradient-to-b from-slate-400 to-slate-600', 
            lock: 'bg-slate-800', 
            glow: 'shadow-[0_10px_30px_rgba(217,119,6,0.3)] group-hover:shadow-[0_15px_40px_rgba(217,119,6,0.5)]' 
        },
        [ChestType.RARE]: { 
            bg: 'bg-gradient-to-b from-blue-500 to-blue-800', 
            trim: 'bg-gradient-to-b from-slate-100 to-slate-300', 
            lock: 'bg-slate-900', 
            glow: 'shadow-[0_10px_30px_rgba(59,130,246,0.5)] group-hover:shadow-[0_15px_40px_rgba(59,130,246,0.7)]' 
        },
        [ChestType.EPIC]: { 
            bg: 'bg-gradient-to-b from-purple-500 to-purple-900', 
            trim: 'bg-gradient-to-b from-yellow-300 to-yellow-600', 
            lock: 'bg-rose-600', 
            glow: 'shadow-[0_10px_40px_rgba(168,85,247,0.6)] group-hover:shadow-[0_20px_50px_rgba(168,85,247,0.8)]' 
        }
    };
    const s = styles[type];

    return (
        <div className={`relative w-20 h-16 flex flex-col items-center justify-end transition-all duration-300 transform group-hover:-translate-y-2 group-hover:scale-110 mb-4`}>
            {/* Свечение позади сундука */}
            <div className={`absolute -inset-4 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0 ${s.glow.split(' ')[0].replace('shadow-', 'bg-').replace('rgba(', '').replace(',0.3)', '').replace(',0.5)', '').replace(',0.6)', '')} / 30`}></div>
            
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-end drop-shadow-2xl">
                {/* Крышка (Lid) */}
                <div className={`w-full h-8 ${s.bg} rounded-t-2xl relative border-b-2 border-black/50 shadow-inner overflow-hidden`}>
                    <div className={`absolute top-0 left-2 w-1.5 h-full ${s.trim} shadow-[1px_0_2px_rgba(0,0,0,0.5)]`}></div>
                    <div className={`absolute top-0 right-2 w-1.5 h-full ${s.trim} shadow-[1px_0_2px_rgba(0,0,0,0.5)]`}></div>
                    <div className={`absolute bottom-0 left-0 w-full h-1.5 ${s.trim} shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}></div>
                    {/* Блик на крышке */}
                    <div className="absolute top-0 inset-x-0 h-2 bg-white/20 rounded-t-2xl"></div>
                </div>
                {/* Основание (Base) */}
                <div className={`w-[94%] h-8 ${s.bg} rounded-b-xl relative shadow-inner overflow-hidden border-t border-white/10`}>
                    <div className={`absolute top-0 left-2 w-1.5 h-full ${s.trim}`}></div>
                    <div className={`absolute top-0 right-2 w-1.5 h-full ${s.trim}`}></div>
                    {/* Тень на дне */}
                    <div className="absolute bottom-0 inset-x-0 h-3 bg-black/40"></div>
                </div>
                {/* Замок (Lock) */}
                <div className={`absolute top-5 w-4 h-5 ${s.lock} rounded border-2 border-black/60 shadow-lg flex items-center justify-center z-20`}>
                    <div className="w-1 h-1.5 bg-black/80 rounded-sm"></div>
                </div>
            </div>
        </div>
    );
};

export const InventoryPage: React.FC<Props> = ({ profile, onRefresh }) => {
  const [isOpeningState, setIsOpeningState] = useState(false);
  const [openingChestIndex, setOpeningChestIndex] = useState<number>(0);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [reward, setReward] = useState<Reward>({ type: RewardType.COINS, amount: 0 });
  const [displayedCoins, setDisplayedCoins] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  
  // Состояние купленных наград
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [now, setNow] = useState(Date.now());

  const { playOpen, playCoins, playFreeze, playLightning, playSelect } = useGameSounds();

  // Загрузка наград из localStorage и запуск таймера
  useEffect(() => {
    const loadRewards = () => {
        const saved = localStorage.getItem('user_purchased_rewards');
        if (saved) {
            // Отфильтровываем те, что уже сгорели
            const parsed: ActiveReward[] = JSON.parse(saved);
            const valid = parsed.filter(r => r.expiresAt > Date.now());
            setActiveRewards(valid);
            if (valid.length !== parsed.length) {
                localStorage.setItem('user_purchased_rewards', JSON.stringify(valid));
            }
        }
    };
    
    loadRewards();
    const interval = setInterval(() => {
        setNow(Date.now());
    }, 1000);
    
    // Добавляем слушатель, чтобы инвентарь обновлялся, если мы купили что-то в магазине
    window.addEventListener('storage', loadRewards);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', loadRewards);
    };
  }, []);

  // Логика счетчика Золотых суток
  useEffect(() => {
    const interval = setInterval(() => {
        if (profile.golden_hour_expires && profile.golden_hour_expires > Date.now()) {
            const diff = Math.floor((profile.golden_hour_expires - Date.now()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setTimeLeft(null);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [profile.golden_hour_expires]);

  // Анимация начисления монет
  useEffect(() => {
    if (appState === AppState.OPENED && reward.type === RewardType.COINS) {
      let start = 0;
      const end = reward.amount;
      const duration = 1500;
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        setDisplayedCoins(Math.floor(start + (end - start) * ease));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      setDisplayedCoins(0);
    }
  }, [appState, reward]);

  const currentChestType = profile.chest_inventory[openingChestIndex] || ChestType.COMMON;

  const handleStartOpening = (index: number) => {
    setOpeningChestIndex(index);
    setAppState(AppState.IDLE);
    setReward({ type: RewardType.COINS, amount: 0 });
    setDisplayedCoins(0);
    setIsOpeningState(true);
  };

  const handleOpenChest = useCallback(() => {
    if (appState === AppState.IDLE) {
      setAppState(AppState.OPENING);
      playOpen();
      
      let selectedReward: Reward = { type: RewardType.COINS, amount: 0 };
      const rand = Math.random() * 100;
      let fChance = 0, lChance = 0;

      if (currentChestType === ChestType.COMMON) { fChance = 1; lChance = 0.2; }
      else if (currentChestType === ChestType.RARE) { fChance = 2; lChance = 0.5; }
      else if (currentChestType === ChestType.EPIC) { fChance = 4; lChance = 1; }

      if (rand < lChance) selectedReward = { type: RewardType.LIGHTNING, amount: 1 };
      else if (rand < lChance + fChance) selectedReward = { type: RewardType.FREEZE, amount: 1 };
      else {
        let amt = currentChestType === ChestType.EPIC ? getGaussianRandom(140, 500) : 
                  currentChestType === ChestType.RARE ? getGaussianRandom(60, 120) : getGaussianRandom(10, 50);
        selectedReward = { type: RewardType.COINS, amount: amt };
      }
      
      setReward(selectedReward);
      setTimeout(() => {
        setAppState(AppState.OPENED);
        if (selectedReward.type === RewardType.COINS) playCoins();
        else if (selectedReward.type === RewardType.FREEZE) playFreeze();
        else playLightning();
      }, 600);
    }
  }, [appState, currentChestType, playOpen, playCoins, playFreeze, playLightning]);

  const handleClaim = () => {
    playSelect();
    repo.processChestReward(openingChestIndex, reward.type, reward.amount);
    toast.success("Награда получена!");
    setIsOpeningState(false);
    setAppState(AppState.IDLE);
    onRefresh();
  };

  const handleUseReward = (id: string) => {
    const updated = activeRewards.filter(r => r.id !== id);
    setActiveRewards(updated);
    localStorage.setItem('user_purchased_rewards', JSON.stringify(updated));
    toast.success("Отлично! Награда использована.", { icon: '🎉' });
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      
      {/* ГЛАВНЫЙ ИНТЕРФЕЙС ИНВЕНТАРЯ */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${isOpeningState ? 'blur-md scale-[0.98] opacity-40 pointer-events-none' : ''}`}>
        
        {/* Header с балансом монет (Как в Магазине) */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white mb-1 flex items-center gap-3 drop-shadow-sm">
                <Shield className="text-indigo-400" size={32} /> Инвентарь
            </h2>
            <p className="text-slate-400 text-sm font-medium">Ваши магические артефакты и добыча.</p>
          </div>
          
          <div className="bg-slate-900/80 px-5 py-2.5 rounded-2xl border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md">
              <Coins className="text-yellow-400 drop-shadow-md" size={24} />
              <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500">
                  {profile.coins}
              </span>
          </div>
        </div>

        <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-10">
            
            {/* Секция: Активные предметы и эффекты */}
            <div className="shrink-0">
                <h3 className="font-bold text-slate-300 flex items-center gap-2 mb-4 uppercase tracking-widest text-xs">
                    <Zap size={16} className="text-cyan-400" /> Активные эффекты
                </h3>
                
                {/* Сетка ограничена по ширине (max-w-xl), чтобы 2 элемента не растягивались на весь экран */}
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                    {/* Заморозка */}
                    <GlassCard className={`relative overflow-hidden group p-5 flex flex-col items-center justify-center text-center shadow-lg transition-all ${profile.has_freeze ? 'border-cyan-500/30 hover:border-cyan-400/50 bg-cyan-950/20' : 'border-white/5 bg-slate-900/40 opacity-70'}`}>
                        {profile.has_freeze && <div className="absolute -inset-10 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner ${profile.has_freeze ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50' : 'bg-slate-800 ring-1 ring-white/10'}`}>
                            <Snowflake size={28} className={profile.has_freeze ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-slate-600'} />
                        </div>
                        <div className="text-3xl font-black font-mono text-white tracking-tight">{profile.has_freeze ? '1' : '0'}</div>
                        <div className={`text-[11px] uppercase font-bold tracking-widest mt-1 ${profile.has_freeze ? 'text-cyan-400/80' : 'text-slate-500'}`}>Заморозка стрика</div>
                    </GlassCard>

                    {/* Золотые сутки (Таймер) */}
                    <GlassCard className={`relative overflow-hidden group p-5 flex flex-col items-center justify-center text-center shadow-lg transition-all ${timeLeft ? 'border-orange-500/40 hover:border-orange-400/60 bg-orange-950/20' : 'border-white/5 bg-slate-900/40 opacity-70'}`}>
                        {timeLeft && <div className="absolute -inset-10 bg-orange-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-colors animate-pulse" />}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner ${timeLeft ? 'bg-orange-500/20 ring-1 ring-orange-500/50' : 'bg-slate-800 ring-1 ring-white/10'}`}>
                            {timeLeft ? <Timer size={28} className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" /> : <Zap size={28} className="text-slate-600" />}
                        </div>
                        <div className={`text-2xl font-black font-mono tracking-tight ${timeLeft ? 'text-transparent bg-clip-text bg-gradient-to-b from-orange-200 to-orange-500' : 'text-white'}`}>
                            {timeLeft ? timeLeft : '0'}
                        </div>
                        <div className={`text-[11px] uppercase font-bold tracking-widest mt-1 ${timeLeft ? 'text-orange-400/80' : 'text-slate-500'}`}>Золотые сутки</div>
                    </GlassCard>
                </div>
            </div>

            {/* НОВОЕ: Секция купленных наград (с таймером 24 часа) */}
            {activeRewards.length > 0 && (
                <div className="shrink-0 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <Clock size={16} className="text-rose-400" /> Сгорающие награды
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeRewards.map(reward => {
                            const timeLeftMs = reward.expiresAt - now;
                            if (timeLeftMs <= 0) return null; // Скрываем, если сгорело

                            const progress = Math.max(0, Math.min(100, (timeLeftMs / TWENTY_FOUR_HOURS_MS) * 100));
                            const h = Math.floor(timeLeftMs / (1000 * 60 * 60));
                            const m = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                            
                            const isDanger = progress < 20; // Меньше 20% времени осталось

                            return (
                                <GlassCard key={reward.id} className="relative flex flex-col p-4 overflow-hidden border-white/5 bg-slate-900/60 shadow-lg">
                                    <div className="flex items-start justify-between mb-3 z-10 relative">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${reward.category === 'food' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {reward.category === 'food' ? <Utensils size={20} /> : <Flame size={20} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{reward.name}</div>
                                                <div className={`text-xs font-mono mt-0.5 flex items-center gap-1 ${isDanger ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                                                    <Clock size={12} /> {h}ч {m}м
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Прогресс-бар времени */}
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4 z-10 relative">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${isDanger ? 'bg-red-500' : 'bg-cyan-400'}`} 
                                            style={{ width: `${progress}%` }} 
                                        />
                                    </div>

                                    <Button 
                                        onClick={() => handleUseReward(reward.id)} 
                                        variant="ghost" 
                                        className="w-full mt-auto bg-white/5 hover:bg-white/10 text-white py-2 flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-wider z-10 relative border border-white/5"
                                    >
                                        <CheckCircle size={16} /> Выполнить
                                    </Button>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Секция: Сундуки (Грид) */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <PackageOpen size={16} className="text-amber-500" /> Неоткрытые сундуки
                    </h3>
                    <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full font-black shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        {profile.chest_inventory.length} шт
                    </span>
                </div>

                <div className="flex-1 bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-inner relative overflow-hidden">
                    {profile.chest_inventory.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                            <PackageOpen size={80} className="mb-6 opacity-20" />
                            <p className="text-lg font-bold uppercase tracking-widest">Хранилище пусто</p>
                            <p className="text-sm mt-2 text-slate-600">Выполняйте задачи, чтобы получить лутбоксы.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {profile.chest_inventory.map((chest, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => handleStartOpening(index)} 
                                    className="group relative flex flex-col items-center p-4 bg-slate-800/50 border border-white/10 rounded-2xl hover:bg-slate-800 hover:border-white/20 transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 animate-in zoom-in-95"
                                >
                                    <ChestGraphic type={chest} />
                                    
                                    <div className="mt-2 text-center">
                                        <span className={`text-xs font-black uppercase tracking-widest drop-shadow-md ${chest === ChestType.EPIC ? 'text-purple-400' : chest === ChestType.RARE ? 'text-blue-400' : 'text-amber-500'}`}>
                                            {chest === ChestType.EPIC ? 'Эпический' : chest === ChestType.RARE ? 'Редкий' : 'Обычный'}
                                        </span>
                                    </div>

                                    {/* Плашка "Открыть" при наведении */}
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl flex items-end justify-center pb-2">
                                        <span className="text-[10px] text-white font-bold uppercase tracking-wider">Открыть</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЛЯ 3D СЦЕНЫ */}
      <div className={`fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 transition-all duration-500 ${isOpeningState ? 'opacity-100 z-[100] pointer-events-auto' : 'opacity-0 -z-50 pointer-events-none delay-200'}`}>
        
        <div className={`w-full max-w-5xl h-[80vh] min-h-[500px] bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-500 ${isOpeningState ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
          
          <Button 
            variant="ghost" 
            className={`absolute top-6 right-6 z-50 text-slate-400 hover:text-white bg-black/40 hover:bg-black/70 rounded-full p-3 transition-opacity duration-300 backdrop-blur-sm ${appState === AppState.IDLE ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setIsOpeningState(false)}
          >
            <X size={24} />
          </Button>

          {/* Canvas находится в DOM всегда */}
          <div className="absolute inset-0 z-0">
            <Canvas 
              shadows 
              dpr={[1, 1.5]} 
              camera={{ position: [0, 3, 6], fov: 45 }}
              gl={{ powerPreference: "high-performance", antialias: false }}
              frameloop={isOpeningState ? "always" : "demand"}
            >
              <Experience appState={appState} chestType={currentChestType} reward={reward} onOpen={handleOpenChest} />
            </Canvas>
          </div>

          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-between py-12">
            <div className="text-center mt-4">
               <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] uppercase tracking-widest">
                  {appState === AppState.IDLE ? "Нажми на сундук" : appState === AppState.OPENED ? "Лут получен!" : "Открываем..."}
               </h1>
            </div>

            {appState === AppState.OPENED && (
              <div className="flex flex-col items-center animate-in zoom-in-75 fade-in duration-700 ease-out translate-y-[-20px]">
                {reward.type === RewardType.COINS ? (
                  <div className="flex flex-col items-center relative">
                    <div className="absolute -inset-32 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="flex items-center gap-6 relative z-10">
                      <Coins size={80} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                      <span className="text-8xl font-black text-white drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]">{displayedCoins}</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400 uppercase mt-4 tracking-widest bg-black/20 px-6 py-2 rounded-full backdrop-blur-md border border-yellow-500/20">
                        Золотых монет
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center relative">
                    <div className={`absolute -inset-32 blur-[80px] rounded-full animate-pulse ${reward.type === RewardType.FREEZE ? 'bg-cyan-500/30' : 'bg-orange-500/30'}`} />
                    <div className="text-6xl md:text-7xl font-black text-white uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] relative z-10 tracking-tight">
                        {reward.type === RewardType.FREEZE ? 'Заморозка' : 'Золотой день'}
                    </div>
                    <div className={`${reward.type === RewardType.FREEZE ? 'text-cyan-400 border-cyan-500/30' : 'text-orange-400 border-orange-500/30'} bg-black/30 backdrop-blur-md border font-bold uppercase mt-6 tracking-widest relative z-10 px-6 py-2 rounded-full`}>
                        Магический артефакт
                    </div>
                  </div>
                )}
                
                <Button 
                    onClick={handleClaim} 
                    variant="primary" 
                    className="mt-16 px-16 py-5 text-xl pointer-events-auto font-black tracking-widest shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_rgba(6,182,212,0.8)] border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/40 rounded-2xl hover:-translate-y-1 transition-all duration-300"
                >
                    ЗАБРАТЬ В ИНВЕНТАРЬ
                </Button>
              </div>
            )}
            <div /> 
          </div>
        </div>
      </div>

    </div>
  );
};