import React, { useState, useMemo } from 'react';
import { FoodEntry } from '../types';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { Droplet, Plus, Trash2, History as HistoryIcon, Flame, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { SoundManager } from '../components/SoundManager';
import { toast } from 'react-hot-toast';
import { ai } from '../services/ai';
import Wave from 'react-wavify';

interface Props {
  entries: FoodEntry[];
  water: number;
  onAddFood: (f: Omit<FoodEntry, 'id'>) => void;
  onDeleteFood: (id: number) => void;
  onUpdateWater: (amount: number) => void;
  onResetWater: () => void;
  onGoToHistory: () => void;
}

const GOAL_WATER = 3000;
const GOAL_KCAL = 4000;

const WaterProgressBar = ({ percent }: { percent: number }) => {
  const safePercent = Math.min(Math.max(percent, 0), 100);

  return (
    <div className="relative mb-4">
      <style>{`
        @keyframes water-bubble {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }
        .animate-water-bubble {
          animation: water-bubble ease-in infinite;
        }
      `}</style>

      {/* Основная колба прогресс-бара */}
      <div className="h-20 bg-slate-950/90 rounded-2xl overflow-hidden relative border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        
        {/* Контейнер заполнения (синяя часть) */}
        <div 
          className="absolute top-0 left-0 bottom-0 z-10 overflow-hidden"
          style={{ 
              width: `${safePercent}%`,
              transition: 'width 1.5s cubic-bezier(0.23, 1, 0.32, 1)' 
          }}
        >
          {/* Фон заливки для плотности цвета */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 to-cyan-500/40" />

          {/* Слой волн */}
          <div className="absolute inset-0 w-full pointer-events-none">
            {/* Задняя волна */}
            <Wave 
              fill="url(#waterGradientDark)"
              paused={false}
              options={{ height: 20, amplitude: 15, speed: 0.15, points: 4 }}
              className="absolute inset-0 h-full opacity-60"
            />
            
            {/* Передняя волна */}
            <Wave 
              fill="url(#waterGradientLight)"
              paused={false}
              options={{ height: 25, amplitude: 10, speed: 0.25, points: 3 }}
              className="absolute inset-0 h-full mix-blend-screen opacity-80"
            />

            {/* Пузырьки (появляются только внутри заполненной части) */}
            <div className="absolute inset-0 w-full overflow-hidden">
              {[...Array(15)].map((_, i) => {
                const size = Math.random() * 5 + 2;
                const left = Math.random() * 100;
                const delay = Math.random() * 8;
                const duration = Math.random() * 3 + 3;
                return (
                  <div 
                    key={i}
                    className="absolute -bottom-6 bg-cyan-200 rounded-full animate-water-bubble opacity-30"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${left}%`,
                      animationDuration: `${duration}s`,
                      animationDelay: `${delay}s`,
                      filter: 'blur(1px)'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Стеклянные блики поверх всего прогресс-бара */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-white/5 to-transparent"></div>
          <div className="absolute inset-0 rounded-2xl border border-white/10 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]"></div>
        </div>

        {/* Определения SVG градиентов */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="waterGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="waterGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export const CaloriesPage: React.FC<Props> = ({ 
  entries, 
  water, 
  onAddFood, 
  onDeleteFood, 
  onUpdateWater, 
  onResetWater, 
  onGoToHistory 
}) => {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [f, setF] = useState('');
  const [c, setC] = useState('');
  const [phase, setPhase] = useState<'morning' | 'day' | 'evening'>('morning');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');

  const totals = useMemo(() => {
    return entries.reduce((acc, curr) => ({
      kcal: acc.kcal + curr.kcal,
      p: acc.p + curr.p,
      f: acc.f + curr.f,
      c: acc.c + curr.c
    }), { kcal: 0, p: 0, f: 0, c: 0 });
  }, [entries]);

  const waterPercent = Math.min((water / GOAL_WATER) * 100, 100);

  const handleAdd = () => {
    if (!name || !kcal) {
        toast.error("Введите название и калорийность!");
        return;
    }
    onAddFood({
      date_str: new Date().toISOString().split('T')[0],
      phase,
      name,
      kcal: parseInt(kcal),
      p: parseFloat(p) || 0,
      f: parseFloat(f) || 0,
      c: parseFloat(c) || 0
    });
    setName(''); setKcal(''); setP(''); setF(''); setC('');
  };
  
  const handleAiCalculate = async () => {
      if (!name) {
          toast.error("Сперва введите название продукта и вес");
          return;
      }
      setIsAiLoading(true);
      setAiStatus('Анализ состава...');
      try {
          const result = await ai.analyzeFood(name, (msg) => setAiStatus(msg));
          if (result && typeof result.kcal !== 'undefined') {
              setKcal(result.kcal.toString());
              setP(result.protein.toString());
              setF(result.fat.toString());
              setC(result.carbs.toString());
              SoundManager.playSuccess("БЖУ рассчитано!");
          } else {
              toast.error("Не удалось определить состав.");
          }
      } catch (error) {
          toast.error("Ошибка сети или ИИ.");
      } finally {
          setIsAiLoading(false);
          setAiStatus('');
      }
  };

  const handleResetClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (water === 0) return;
      if (window.confirm('Сбросить счетчик воды?')) {
          onResetWater();
          toast.success('Сброшено');
      }
  };

  const PhaseList = ({ title, ph }: { title: string, ph: string }) => {
    const list = entries.filter(e => e.phase === ph);
    return (
      <div className="bg-slate-950/20 rounded-xl p-4 border border-white/5 min-w-[280px]">
        <h3 className="font-bold text-slate-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">{title}</span>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                {list.reduce((sum, i) => sum + i.kcal, 0)} kcal
            </span>
        </h3>
        <div className="space-y-2">
            {list.map(item => (
                <div key={item.id} className="bg-slate-800/40 p-3 rounded-xl flex justify-between items-start group hover:bg-slate-800 transition-all border border-white/5">
                    <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            🔥 {item.kcal} | Б:{item.p} Ж:{item.f} У:{item.c}
                        </div>
                    </div>
                    <button onClick={() => onDeleteFood(item.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            {list.length === 0 && <div className="text-xs text-slate-600 italic py-2 text-center">Нет записей</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* ВОДА */}
         <GlassCard className="flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-20 flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Droplet className="text-cyan-400 animate-pulse" />
                    <span className="font-bold text-lg">Вода сегодня</span>
                </div>
                <div className="text-2xl font-black font-mono text-white">
                    {water} <span className="text-xs text-slate-500 font-normal">/ {GOAL_WATER} мл</span>
                </div>
            </div>
            
            <WaterProgressBar percent={waterPercent} />
            
            <div className="relative z-20 flex flex-col gap-2">
                <div className="flex gap-2">
                    <Button onClick={() => onUpdateWater(water + 250)} variant="primary" className="flex-1 py-3">+250 мл</Button>
                    <Button onClick={() => onUpdateWater(Math.max(0, water - 250))} variant="secondary" className="flex-1 py-3">-250 мл</Button>
                </div>
                <button onClick={handleResetClick} className="text-[10px] text-slate-600 hover:text-red-400 py-1 transition-colors flex items-center justify-center gap-1">
                    <RotateCcw size={10} /> Сбросить прогресс
                </button>
            </div>
         </GlassCard>

         {/* КАЛОРИИ */}
         <GlassCard className="flex flex-col justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Flame size={140} />
             </div>
             
             <div className="relative z-10 flex justify-between items-start">
                 <div className="flex items-center gap-2">
                     <Flame className="text-orange-500" />
                     <span className="font-bold text-lg">Энергия</span>
                 </div>
                 <Button onClick={onGoToHistory} variant="secondary" className="text-[10px] py-1 px-3 h-7 bg-white/5 border-white/10">
                     <HistoryIcon size={12} /> История
                 </Button>
             </div>

             <div className="relative z-10 text-center py-4">
                 <div className="text-5xl font-black text-white mb-1 drop-shadow-lg">{totals.kcal}</div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Цель: {GOAL_KCAL} ккал</div>
             </div>

             <div className="relative z-10 grid grid-cols-3 gap-2">
                 {[
                   { label: 'Белки', val: totals.p, color: 'text-cyan-400' },
                   { label: 'Жиры', val: totals.f, color: 'text-purple-400' },
                   { label: 'Углеводы', val: totals.c, color: 'text-yellow-400' }
                 ].map(m => (
                    <div key={m.label} className="bg-slate-950/40 rounded-xl p-2 border border-white/5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">{m.label}</div>
                        <div className={`font-mono font-bold ${m.color}`}>{m.val.toFixed(0)}г</div>
                    </div>
                 ))}
             </div>
         </GlassCard>
      </div>

      <GlassCard className="flex-1 flex flex-col min-h-0">
         <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex gap-4 h-full">
                <PhaseList title="🌅 Завтрак" ph="morning" />
                <PhaseList title="☀️ Обед" ph="day" />
                <PhaseList title="🌙 Ужин" ph="evening" />
            </div>
         </div>
         
         <div className="mt-4 pt-4 border-t border-white/5">
             <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                 <div className="w-full md:w-32">
                     <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Прием</label>
                     <select value={phase} onChange={e => setPhase(e.target.value as any)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-cyan-500 transition-colors">
                         <option value="morning">🌅 Утро</option>
                         <option value="day">☀️ День</option>
                         <option value="evening">🌙 Вечер</option>
                     </select>
                 </div>
                 
                 <div className="flex-1 min-w-[200px]">
                     <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Продукт и вес</label>
                     <div className="flex gap-2">
                        <input 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleAiCalculate()}
                            placeholder="Напр: 150г стейка" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-cyan-500 transition-all" 
                        />
                        <div className="relative">
                            {isAiLoading && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] text-cyan-400 bg-slate-900 border border-cyan-500/30 px-2 py-0.5 rounded-md whitespace-nowrap animate-pulse">
                                    {aiStatus}
                                </div>
                            )}
                            <Button 
                                onClick={handleAiCalculate} 
                                disabled={isAiLoading}
                                variant="secondary"
                                className={`h-[42px] px-3 ${isAiLoading ? 'opacity-50' : 'text-purple-400 hover:bg-purple-500/10 border-purple-500/20'}`}
                            >
                                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            </Button>
                        </div>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
                    {[
                      { l: 'Ккал', v: kcal, s: setKcal },
                      { l: 'Б', v: p, s: setP },
                      { l: 'Ж', v: f, s: setF },
                      { l: 'У', v: c, s: setC }
                    ].map(field => (
                        <div key={field.l} className="w-full md:w-16">
                            <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block text-center">{field.l}</label>
                            <input type="number" value={field.v} onChange={e => field.s(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm outline-none text-center focus:border-cyan-500 transition-colors" />
                        </div>
                    ))}
                 </div>
                 
                 <Button onClick={handleAdd} variant="primary" className="h-[42px] px-6 w-full md:w-auto shadow-lg shadow-cyan-500/20">
                     <Plus size={20} />
                 </Button>
             </div>
         </div>
      </GlassCard>
    </div>
  );
};