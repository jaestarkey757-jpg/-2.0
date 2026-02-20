import React, { useState } from 'react';
import { SportEntry } from '../types';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { Dumbbell, Trash2, History as HistoryIcon, Sparkles, Loader2, Zap, Activity, Flame } from 'lucide-react';
import { SoundManager } from '../components/SoundManager';
import { toast } from 'react-hot-toast';
import { ai } from '../services/ai';

interface Props {
  entries: SportEntry[];
  onAdd: (s: Omit<SportEntry, 'id'>) => void;
  onDelete: (id: number) => void;
  onGoToHistory: () => void;
}

type Intensity = 'Легкая' | 'Средняя' | 'Тяжелая';

// Тип для наших ударных волн
interface RippleEffect {
    id: number;
    color: string;
}

export const SportPage: React.FC<Props> = ({ entries, onAdd, onDelete, onGoToHistory }) => {
  const [inputText, setInputText] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('Средняя');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  
  // Массив волн (чтобы можно было быстро спамить кнопку и видеть несколько волн)
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  // Подсчет выполненных подходов
  const totalSets = entries.reduce((acc, curr) => {
      if (!curr.details) return acc;
      const match = curr.details.match(/(\d+)\s*(?:по|х|x|на)/i);
      return acc + (match ? parseInt(match[1]) : 1);
  }, 0);

  // Функция запуска глассморфизм-волны
  const triggerPulseAnimation = (currentIntensity: Intensity) => {
      let color = 'rgba(168, 85, 247, 0.5)'; // Фиолетовый (Средняя)
      if (currentIntensity === 'Тяжелая') color = 'rgba(244, 63, 94, 0.5)'; // Розовый/Красный
      if (currentIntensity === 'Легкая') color = 'rgba(34, 197, 94, 0.5)'; // Зеленый

      const newRipple = { id: Date.now(), color };
      setRipples(prev => [...prev, newRipple]);

      // Удаляем волну из DOM после завершения анимации (1 секунда)
      setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1000);
  };

  const handleSmartAdd = async () => {
    if (!inputText.trim()) {
        toast.error("Опишите упражнение!");
        return;
    }

    setIsParsing(true);
    setParsingStatus('Запуск ИИ...');
    
    try {
        let parsed = await ai.parseSportEntry(inputText, (msg) => setParsingStatus(msg));
        
        let finalName = "Активность";
        let finalDetails = "";
        let finalWeight = "";

        if (parsed) {
            finalName = parsed.name || "Активность";
            finalDetails = parsed.details || "";
            finalWeight = parsed.weight || "";
            toast.success("ИИ успешно распознал текст!");
        } else {
            toast("ИИ недоступен, записано как есть", { icon: "⚠️" });
            finalName = inputText.split(',')[0] || inputText;
        }

        const finalDetailsWithTag = `${finalDetails} [${intensity}]`.trim();

        onAdd({
            date_str: new Date().toISOString().split('T')[0],
            name: finalName.charAt(0).toUpperCase() + finalName.slice(1),
            details: finalDetailsWithTag,
            weight: finalWeight
        });

        SoundManager.playSuccess("Упражнение записано!");
        triggerPulseAnimation(intensity); // Вызываем нашу новую волну!
        
        setInputText('');
        setIntensity('Средняя');
    } catch (err) {
        toast.error("Произошла ошибка при обработке");
        console.error(err);
    } finally {
        setIsParsing(false);
        setParsingStatus('');
    }
  };

  const getIntensityColor = (detailsString: string) => {
      if (!detailsString) return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
      if (detailsString.includes('[Тяжелая]')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
      if (detailsString.includes('[Легкая]')) return 'text-green-400 bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'; 
  };

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      
      {/* МАГИЯ ГЛАССМОРФИЗМА: 
        Инжектируем CSS анимации прямо в компонент.
      */}
      <style>{`
        @keyframes shockwave-glass {
          0% { 
            transform: translate(-50%, -50%) scale(0); 
            opacity: 1; 
            border-width: 20px; 
          }
          100% { 
            transform: translate(-50%, -50%) scale(2.5); 
            opacity: 0; 
            border-width: 0px; 
          }
        }
        @keyframes shockwave-color {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .ripple-container {
          position: absolute; 
          inset: 0; 
          pointer-events: none; 
          z-index: 50; /* Поверх карточек, но под уведомлениями */
          overflow: hidden;
        }
        .glass-ring {
          position: absolute; 
          top: 50%; 
          left: 50%;
          width: 80vmin; /* Круг будет идеально круглым на любом экране */
          height: 80vmin; 
          border-radius: 50%;
          border: solid rgba(255, 255, 255, 0.8);
          /* Эффект линзы и искажения */
          backdrop-filter: blur(16px) brightness(1.2) contrast(1.1);
          -webkit-backdrop-filter: blur(16px) brightness(1.2) contrast(1.1);
          animation: shockwave-glass 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .color-blob {
          position: absolute; 
          top: 50%; 
          left: 50%;
          width: 60vmin; 
          height: 60vmin; 
          border-radius: 50%;
          filter: blur(50px); 
          mix-blend-mode: screen;
          animation: shockwave-color 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* Контейнер для рендеринга волн */}
      <div className="ripple-container">
          {ripples.map(r => (
              <React.Fragment key={r.id}>
                  {/* Искажающее стекло с цветной тенью */}
                  <div 
                      className="glass-ring" 
                      style={{ boxShadow: `0 0 60px ${r.color}, inset 0 0 60px ${r.color}` }}
                  />
                  {/* Мягкая цветовая сердцевина */}
                  <div 
                      className="color-blob" 
                      style={{ backgroundColor: r.color }} 
                  />
              </React.Fragment>
          ))}
      </div>

      {/* --- ОСТАЛЬНОЙ ИНТЕРФЕЙС --- */}
      <div className="flex flex-col gap-4 shrink-0 relative z-10">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    <Activity size={24} />
                </div>
                Журнал тренировок
             </h2>
             <Button onClick={onGoToHistory} variant="secondary" className="text-xs py-2 px-3">
                 <HistoryIcon size={16} /> История
             </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Dumbbell size={100} />
                  </div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Упражнений</p>
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                          {entries.length}
                      </p>
                  </div>
              </GlassCard>
              
              <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Zap size={100} />
                  </div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Всего подходов</p>
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
                          {totalSets}
                      </p>
                  </div>
              </GlassCard>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 relative z-10">
          
          <GlassCard className="flex flex-col gap-5 h-fit relative">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Sparkles size={18} className="text-cyan-400" />
                  <h3 className="font-semibold text-slate-300">Умное добавление</h3>
              </div>
              
              <div>
                  <label className="text-xs text-slate-500 mb-2 block uppercase tracking-wider font-bold">Опишите подход</label>
                  <textarea 
                      value={inputText} 
                      onChange={e => setInputText(e.target.value)} 
                      placeholder="Напр: Жим лежа, 2 подхода по 6 повторений, 65кг..." 
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-4 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-28 text-sm" 
                  />
              </div>

              <div>
                  <label className="text-xs text-slate-500 mb-2 block uppercase tracking-wider font-bold">Интенсивность</label>
                  <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                      {(['Легкая', 'Средняя', 'Тяжелая'] as Intensity[]).map(level => (
                          <button
                              key={level}
                              onClick={() => setIntensity(level)}
                              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                  intensity === level 
                                    ? level === 'Тяжелая' ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                    : level === 'Легкая' ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                    : 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                          >
                              {level}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="relative mt-2">
                  {isParsing && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-center text-[10px] text-cyan-400 bg-slate-900/90 rounded px-3 py-1 whitespace-nowrap z-50 animate-pulse border border-cyan-900 shadow-xl">
                          {parsingStatus}
                      </div>
                  )}
                  <Button 
                      onClick={handleSmartAdd} 
                      disabled={isParsing}
                      variant="primary" 
                      className={`w-full py-4 text-sm font-bold tracking-widest shadow-lg ${isParsing ? 'opacity-70' : 'hover:-translate-y-1'}`}
                  >
                      {isParsing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} 
                      {isParsing ? 'АНАЛИЗ...' : 'ЗАПИСАТЬ'}
                  </Button>
              </div>
          </GlassCard>

          <GlassCard className="md:col-span-2 flex flex-col min-h-0" noPadding>
              <div className="p-4 border-b border-white/5 bg-slate-800/30 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-300 uppercase tracking-widest text-xs flex items-center gap-2">
                      <Flame size={16} className="text-orange-500" /> Выполнено сегодня
                  </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {entries.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                          <Dumbbell size={48} className="mb-4 opacity-20" />
                          <p className="text-sm">Журнал пуст. Время попотеть!</p>
                      </div>
                  )}
                  
                  {entries.map(e => {
                      const colorClass = getIntensityColor(e.details);
                      const cleanDetails = e.details ? e.details.replace(/\\[.*?\\]/, '').trim() : ''; 
                      
                      return (
                          <div 
                              key={e.id} 
                              className={`relative overflow-hidden bg-slate-900/60 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 hover:bg-slate-800/80 ${colorClass}`}
                          >
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorClass.split(' ')[0].replace('text-', 'bg-')}`} />
                              
                              <div className="flex items-center gap-4 pl-2">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-current bg-slate-950/50`}>
                                      <Dumbbell size={20} className="opacity-80" />
                                  </div>
                                  <div>
                                      <div className="font-bold text-white text-lg tracking-tight">{e.name}</div>
                                      <div className="text-sm flex items-center gap-2 mt-0.5">
                                          {cleanDetails && <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded text-xs border border-white/5">{cleanDetails}</span>}
                                          {e.weight && <span className="text-slate-400 font-mono text-xs">{e.weight}</span>}
                                      </div>
                                  </div>
                              </div>
                              
                              <Button 
                                  onClick={() => onDelete(e.id)} 
                                  variant="ghost" 
                                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30"
                              >
                                  <Trash2 size={18} />
                              </Button>
                          </div>
                      );
                  })}
              </div>
          </GlassCard>
      </div>
    </div>
  );
};