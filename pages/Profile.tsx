import React, { useState, useRef } from 'react';
import { UserProfile, ACHIEVEMENTS_LIST, RANKS } from '../types';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    Save, User as UserIcon, Lock, Unlock, Trophy, ArrowLeft, 
    Upload, Crown, TrendingUp, Download, Database, ChevronRight 
} from 'lucide-react';
import { SoundManager } from '../components/SoundManager';
import { ImageCropper } from '../components/ImageCropper';
import { repo } from '../services/repository';
import { toast } from 'react-hot-toast';

interface Props {
  profile: UserProfile;
  weightHistory: { date: string, weight: number }[];
  achievements: Record<string, string>;
  onUpdateProfile: (p: Partial<UserProfile>) => void;
  onLogWeight: (w: number) => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<Props> = ({ profile, weightHistory, achievements, onUpdateProfile, onLogWeight, onBack }) => {
  const [weight, setWeight] = useState(profile.weight.toString());
  const [bf, setBf] = useState(profile.body_fat.toString());
  const [avatar, setAvatar] = useState(profile.avatar_path);
  const [showRankRoad, setShowRankRoad] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const w = parseFloat(weight);
    onUpdateProfile({
        weight: w,
        body_fat: parseFloat(bf),
        avatar_path: avatar
    });
    if (w > 0) onLogWeight(w);
    SoundManager.playSuccess("Параметры сохранены");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
            setCropImage(event.target.result as string);
            e.target.value = '';
          }
      };
      reader.readAsDataURL(file);
  };
  
  const handleCropped = (base64: string) => {
      setAvatar(base64);
      setCropImage(null);
      SoundManager.playClick();
  };

  // --- Backup Logic ---
  const handleExport = () => {
      const dataStr = repo.exportData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `daily_organizer_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Резервная копия сохранена");
  };

  const handleImportClick = () => {
      backupInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              const success = repo.importData(event.target.result as string);
              if (success) {
                  toast.success("Данные успешно загружены! Перезагрузка...");
                  setTimeout(() => window.location.reload(), 1500);
              } else {
                  toast.error("Ошибка чтения файла. Проверьте формат.");
              }
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const formattedHistory = weightHistory.map(h => ({ ...h, date: h.date.substring(5) }));
  const hasHistory = formattedHistory.length > 0;
  
  // Расчет прогресса рангов
  const currentRank = RANKS.reduce((prev, curr) => (profile.xp >= curr.threshold ? curr : prev), RANKS[0]);
  const currentRankIndex = RANKS.findIndex(r => r.title === currentRank.title);
  const isMaxRank = currentRankIndex === RANKS.length - 1;
  const nextRank = isMaxRank ? currentRank : RANKS[currentRankIndex + 1];
  
  const xpProgress = isMaxRank 
      ? 100 
      : Math.min(100, Math.max(0, ((profile.xp - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100));

  // Опции для вертикального пути рангов
  const ITEM_HEIGHT = 160; 
  const BOTTOM_PADDING = 80;
  const BASE_OFFSET = 40 + BOTTOM_PADDING + (ITEM_HEIGHT / 2); // 200

  let progressPx = BASE_OFFSET;
  let nextThresholdForRoad = 0;

  for (let i = 0; i < RANKS.length - 1; i++) {
      const start = RANKS[i].threshold;
      const end = RANKS[i+1].threshold;
      
      if (profile.xp >= start && profile.xp < end) {
          const ratio = (profile.xp - start) / (end - start);
          progressPx += i * ITEM_HEIGHT;
          progressPx += ratio * ITEM_HEIGHT;
          nextThresholdForRoad = end;
          break;
      } else if (i === RANKS.length - 2 && profile.xp >= end) {
          progressPx += (i + 1) * ITEM_HEIGHT;
          nextThresholdForRoad = end;
      }
  }

  if (profile.xp >= RANKS[RANKS.length - 1].threshold) {
       progressPx = BASE_OFFSET + ((RANKS.length - 1) * ITEM_HEIGHT);
       nextThresholdForRoad = RANKS[RANKS.length - 1].threshold;
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
          <Button onClick={onBack} variant="ghost" className="p-2 h-auto hover:bg-white/10 rounded-full">
              <ArrowLeft size={24} />
          </Button>
          <h2 className="text-2xl font-bold text-white">Профиль</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* ЛЕВАЯ КОЛОНКА: Инфо, Настройки тела, Бэкапы */}
          <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Карточка профиля */}
              <GlassCard className="flex flex-col items-center justify-center relative overflow-hidden group/card p-8">
                  <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none"></div>
                  
                  {/* Аватар */}
                  <div 
                    className="relative group cursor-pointer mb-5 z-10 flex flex-col items-center justify-center rounded-full" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                      {/* Усиленное многослойное свечение (Glow) */}
                      <div className={`absolute -inset-4 rounded-full blur-2xl opacity-60 bg-gradient-to-br ${currentRank.color} group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500 animate-pulse`}></div>
                      <div className={`absolute -inset-1 rounded-full blur-md opacity-80 bg-gradient-to-tr ${currentRank.color} group-hover:opacity-100 transition-all duration-300`}></div>
                      
                      {/* Градиентная обводка (Gradient Border) */}
                      <div className={`relative p-[4px] rounded-full bg-gradient-to-br ${currentRank.color} shadow-2xl`}>
                          {/* Изолированный контейнер, который жестко обрезает квадратный блюр */}
                          <div 
                              className="w-28 h-28 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center relative border-2 border-slate-900 z-10"
                              style={{ transform: 'translateZ(0)' }} 
                          >
                                {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <UserIcon size={48} className="text-slate-500" />}
                                
                                {/* Оверлей при наведении строго в пределах круга */}
                                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-sm z-20">
                                    <Upload size={28} className="text-white drop-shadow-lg" />
                                </div>
                          </div>
                      </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" hidden />
                  
                  {/* Инфо и Ранг */}
                  <div className="text-center w-full z-10">
                      <div 
                        onClick={() => setShowRankRoad(true)}
                        className="cursor-pointer hover:scale-105 transition-transform inline-flex flex-col items-center group/rank"
                      >
                          <p className={`text-xl font-bold bg-gradient-to-r ${currentRank.color} bg-clip-text text-transparent drop-shadow-sm flex items-center gap-2`}>
                              {currentRank.title}
                              <ChevronRight size={18} className="text-slate-500 group-hover/rank:text-white transition-colors opacity-50" />
                          </p>
                      </div>
                      
                      {/* XP Прогресс */}
                      <div className="w-full mt-4">
                          <div className="flex justify-between text-xs font-mono mb-1 text-slate-400">
                              <span>{profile.xp} XP</span>
                              <span>{isMaxRank ? 'MAX' : `${nextRank.threshold} XP`}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                              <div 
                                className={`h-full bg-gradient-to-r ${currentRank.color} transition-all duration-1000 ease-out relative`}
                                style={{ width: `${xpProgress}%` }}
                              >
                                  <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </GlassCard>

              {/* Настройки тела (Компактные) */}
              <GlassCard className="p-5">
                  <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-cyan-400" /> Физиология
                  </h3>
                  <div className="flex gap-3 mb-4">
                      <div className="flex-1 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block px-1">Вес (кг)</label>
                          <input 
                              value={weight} 
                              onChange={e => setWeight(e.target.value)} 
                              className="w-full bg-transparent border-none text-white font-mono text-lg px-1 outline-none" 
                          />
                      </div>
                      <div className="flex-1 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block px-1">Жир (%)</label>
                          <input 
                              value={bf} 
                              onChange={e => setBf(e.target.value)} 
                              className="w-full bg-transparent border-none text-white font-mono text-lg px-1 outline-none" 
                          />
                      </div>
                  </div>
                  <Button onClick={handleSave} variant="primary" className="w-full h-10 text-sm">
                      <Save size={16} /> Обновить данные
                  </Button>
              </GlassCard>

              {/* Управление данными (Компактное) */}
              <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Database size={20} className="text-purple-400" />
                      </div>
                      <div>
                          <h4 className="text-sm font-semibold text-slate-200">База данных</h4>
                          <p className="text-[11px] text-slate-500">Экспорт и импорт JSON</p>
                      </div>
                  </div>
                  <div className="flex gap-1">
                      <Button onClick={handleExport} variant="ghost" className="p-2 h-9 w-9 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg">
                          <Download size={16} />
                      </Button>
                      <Button onClick={handleImportClick} variant="ghost" className="p-2 h-9 w-9 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 rounded-lg">
                          <Upload size={16} />
                      </Button>
                      <input type="file" ref={backupInputRef} onChange={handleImportFile} accept=".json" hidden />
                  </div>
              </div>

          </div>

          {/* ПРАВАЯ КОЛОНКА: График и Достижения */}
          <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* График веса */}
              <GlassCard className="flex flex-col p-5">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                          <TrendingUp className="text-cyan-400" size={20} /> Динамика веса
                      </h3>
                      {hasHistory && <span className="text-xs text-slate-500 font-mono border border-white/10 px-2 py-1 rounded bg-slate-900">{formattedHistory.length} записей</span>}
                  </div>
                  
                  {/* Явно задаем высоту графику, чтобы не "скукоживался" */}
                  <div className="h-[280px] w-full relative bg-slate-950/40 rounded-xl border border-white/5 p-3 shadow-inner">
                    {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={formattedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#475569" tick={{fontSize: 11, fill: '#94a3b8'}} dy={10} axisLine={false} tickLine={false} />
                                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#475569" tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="weight" 
                                    stroke="#22d3ee" 
                                    strokeWidth={4} 
                                    dot={{r: 4, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2}} 
                                    activeDot={{r: 6, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2}} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                            <div className="bg-slate-800/50 p-4 rounded-full mb-3 shadow-inner">
                                <TrendingUp size={32} className="text-slate-400/50" />
                            </div>
                            <p className="text-base font-medium text-slate-300">Нет данных для графика</p>
                            <p className="text-xs mt-2 max-w-xs text-slate-500">Регулярно обновляйте свой вес в панели слева, чтобы видеть прогресс.</p>
                        </div>
                    )}
                  </div>
              </GlassCard>

              {/* Достижения */}
              <div>
                  <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 mb-4 px-1 drop-shadow-sm">
                      <Trophy size={24} /> Достижения
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ACHIEVEMENTS_LIST.map(ach => {
                          const unlocked = !!achievements[ach.code];
                          return (
                              <div 
                                key={ach.code} 
                                className={`
                                    relative overflow-hidden rounded-xl p-3 border flex items-center gap-4 transition-all duration-300
                                    ${unlocked 
                                        ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30 shadow-[0_4px_15px_rgba(234,179,8,0.05)]' 
                                        : 'bg-slate-900/40 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                                    }
                                `}
                              >
                                  {unlocked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50"></div>}
                                  
                                  <div className={`p-3 rounded-full shrink-0 ${unlocked ? 'bg-yellow-500/20 text-yellow-400 shadow-inner' : 'bg-slate-800 text-slate-500'}`}>
                                      {unlocked ? <Unlock size={18} /> : <Lock size={18} />}
                                  </div>
                                  <div>
                                      <div className={`font-bold text-sm ${unlocked ? 'text-yellow-100 drop-shadow-sm' : 'text-slate-400'}`}>{ach.name}</div>
                                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{ach.desc}</div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

          </div>
      </div>

      {/* Модалки (Кроппер и Путь Рангов остаются без изменений по логике, только стили) */}
      {cropImage && (
          <ImageCropper 
            imageSrc={cropImage} 
            onCancel={() => setCropImage(null)} 
            onCrop={handleCropped} 
          />
      )}

      {showRankRoad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-lg h-[90vh] bg-[#1d3557] rounded-3xl relative flex flex-col shadow-2xl overflow-hidden border-4 border-[#14233a]">
                  {/* Pattern Background */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{
                      backgroundImage: 'radial-gradient(circle, #457b9d 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  ></div>

                  {/* Header */}
                  <div className="relative z-20 bg-[#14233a] p-4 flex justify-between items-center shadow-lg border-b border-[#1d3557]">
                      <div className="text-white font-bold text-lg flex items-center gap-2">
                          <Crown className="text-yellow-400" />
                          <span>Путь к Величию</span>
                      </div>
                      <button 
                        onClick={() => setShowRankRoad(false)} 
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow-[0_4px_0_rgb(30,58,138)] active:shadow-none active:translate-y-[4px] transition-all"
                      >
                          Закрыть
                      </button>
                  </div>
                  
                  {/* Scrolling Road */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#1e293b]">
                      <div className="flex flex-col-reverse relative min-h-full" style={{ paddingBottom: '40px', paddingTop: '40px' }}>
                          
                          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-3 bg-[#0f172a] border-x border-white/5 z-0" />

                          <div 
                            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-3 bg-[#3b82f6] border-x border-blue-400 z-0 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            style={{ height: `${progressPx}px` }}
                          />

                          <div 
                            className="absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ease-out flex flex-col items-center"
                            style={{ bottom: `${progressPx - 24}px` }}
                          >
                             <div className="mb-1 flex flex-col items-center animate-bounce">
                                <div className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded shadow whitespace-nowrap border border-blue-400">
                                    {profile.xp} / {nextThresholdForRoad || 'MAX'} XP
                                </div>
                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-blue-600"></div>
                             </div>

                             <div className="text-[10px] font-bold text-white bg-black/70 px-2 rounded mb-1 whitespace-nowrap uppercase tracking-wider">Вы</div>
                             <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.8)] bg-slate-800">
                                {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <UserIcon className="p-2 text-white" />}
                             </div>
                          </div>

                          {RANKS.map((rank, i) => {
                              const isReached = profile.xp >= rank.threshold;
                              const isEven = i % 2 === 0;
                              // @ts-ignore
                              const { cardBg, cardBorder } = rank;

                              return (
                                  <div 
                                    key={rank.threshold} 
                                    className={`relative z-10 flex w-full ${isEven ? 'justify-start pl-8' : 'justify-end pr-8'}`}
                                    style={{ height: `${ITEM_HEIGHT}px`, marginBottom: i === 0 ? `${BOTTOM_PADDING}px` : 0 }}
                                  >
                                      <div className={`w-[160px] relative`}>
                                          <div className={`absolute top-1/2 -translate-y-1/2 w-8 h-1 bg-[#0f172a] z-0 ${isEven ? '-right-8' : '-left-8'}`}>
                                               {isReached && <div className="w-full h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>}
                                          </div>
                                          
                                          <div className={`
                                            absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10
                                            ${isEven ? '-right-[42px]' : '-left-[42px]'}
                                            ${isReached ? 'bg-blue-500 border-white shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-[#0f172a] border-slate-600'}
                                          `}></div>

                                          <div className={`absolute top-0 right-0 -mt-3 -mr-2 bg-[#14233a] text-white px-2 py-0.5 rounded font-mono text-[10px] border border-white/20 z-30 shadow-lg`}>
                                              {rank.threshold}
                                          </div>

                                          <div className={`
                                            h-28 rounded-xl border-b-4 shadow-xl flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-300
                                            ${isReached ? `${cardBg || 'bg-[#588157]'} ${cardBorder || 'border-[#3a5a40]'}` : 'bg-[#334155] border-[#1e293b] grayscale opacity-80'}
                                          `}>
                                              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/5 pointer-events-none"></div>

                                              <div className={`mb-1 p-2 rounded-full ${isReached ? 'bg-black/20' : 'bg-black/40'}`}>
                                                {i === RANKS.length - 1 ? <Crown size={24} className="text-yellow-400 drop-shadow-md" /> :
                                                 <Trophy size={24} className={isReached ? "text-yellow-400" : "text-slate-400"} />}
                                              </div>
                                              
                                              <div className="text-center relative z-10">
                                                <div className="text-[9px] uppercase font-bold text-white/60 tracking-wider">Арена {i + 1}</div>
                                                <div className="text-xs font-bold text-white leading-tight shadow-black drop-shadow-md">{rank.title}</div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                          <div style={{ height: '100px' }}></div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};