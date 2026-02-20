import React, { useState } from 'react';
import { repo } from '../services/repository';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { ChevronRight, ArrowLeft, Sparkles, Loader2, Bot, X } from 'lucide-react';
import { ai } from '../services/ai';
import { toast } from 'react-hot-toast';

interface Props {
    onBack: () => void;
}

export const HistoryPage: React.FC<Props> = ({ onBack }) => {
  const dates = repo.getHistoryDates();
  const [selectedDate, setSelectedDate] = useState<string | null>(dates[0] || null);
  
  // Состояния для AI Саммари
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const water = selectedDate ? repo.getWater(selectedDate) : 0;
  const food = selectedDate ? repo.getFoodEntries(selectedDate) : [];
  const sport = selectedDate ? repo.getSportEntries(selectedDate) : [];
  
  const totalKcal = food.reduce((a, b) => a + b.kcal, 0);

  // Функция для запроса саммари
  const handleGenerateSummary = async () => {
      if (dates.length === 0) {
          toast.error("Недостаточно данных для анализа");
          return;
      }

      setIsAiLoading(true);
      setAiStatus('Подготовка данных...');

      // Берем максимум последние 7 дней (чтобы не превысить лимит контекста Nano)
      const recentDates = dates.slice(0, 7);
      let dataText = "";

      recentDates.forEach(d => {
          const w = repo.getWater(d);
          const f = repo.getFoodEntries(d);
          const s = repo.getSportEntries(d);
          
          const kcal = f.reduce((acc, curr) => acc + curr.kcal, 0);
          const sportNames = s.length > 0 ? s.map(x => x.name).join(', ') : 'нет';

          dataText += `[День ${d}]: Калории: ${kcal} ккал, Вода: ${w} мл, Тренировки: ${sportNames}.\n`;
      });

      try {
          const result = await ai.generateHistorySummary(dataText, (msg) => setAiStatus(msg));
          
          if (result) {
              setAiSummary(result);
              toast.success("Отчет успешно сгенерирован!");
          } else {
              toast.error("ИИ недоступен. Проверьте настройки браузера (window.ai).");
          }
      } catch (err) {
          toast.error("Произошла ошибка при генерации отчета.");
          console.error(err);
      } finally {
          setIsAiLoading(false);
      }
  };

  return (
    <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="ghost" className="p-2 h-auto">
                    <ArrowLeft size={24} />
                </Button>
                <h2 className="text-2xl font-bold text-white">История активности</h2>
            </div>
            
            {/* Кнопка AI Саммари */}
            <Button 
                onClick={handleGenerateSummary}
                disabled={isAiLoading || dates.length === 0}
                className="flex items-center gap-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-all"
            >
                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isAiLoading ? aiStatus : "AI Отчет"}
            </Button>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
            {/* Sidebar List */}
            <div className="w-1/4 flex flex-col">
                <GlassCard className="flex-1 flex flex-col" noPadding>
                    <div className="p-4 border-b border-white/10 bg-slate-800/50">
                        <h3 className="font-semibold text-slate-300">Архив</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {dates.map(d => (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(d)}
                                className={`w-full text-left p-3 rounded-lg text-sm font-mono flex justify-between items-center ${selectedDate === d ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/5 text-slate-400'}`}
                            >
                                {d}
                                {selectedDate === d && <ChevronRight size={14} />}
                            </button>
                        ))}
                        {dates.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">История пуста</div>}
                    </div>
                </GlassCard>
            </div>

            {/* Content */}
            <div className="w-3/4 flex flex-col">
                <GlassCard className="flex-1 overflow-y-auto">
                    
                    {/* Плашка с AI Саммари (появляется только если есть данные) */}
                    {aiSummary && (
                        <div className="mb-6 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-5 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                <Bot size={100} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-purple-300 flex items-center gap-2">
                                        <Sparkles size={16} /> Вывод нейросети
                                    </h3>
                                    <button onClick={() => setAiSummary(null)} className="text-slate-400 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <p className="text-sm text-purple-100/90 leading-relaxed whitespace-pre-wrap">
                                    {aiSummary}
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedDate ? (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-1">{selectedDate}</h2>
                                <div className="flex gap-4 text-sm text-slate-400">
                                    <span>💧 {water} мл</span>
                                    <span>🔥 {totalKcal} ккал</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-slate-300 mb-3 border-b border-white/5 pb-2">Питание</h3>
                                    <div className="space-y-2">
                                        {food.map(f => (
                                            <div key={f.id} className="bg-slate-950/40 p-3 rounded border border-white/5 flex justify-between">
                                                <span>{f.name}</span>
                                                <span className="text-slate-500 font-mono text-sm">{f.kcal}</span>
                                            </div>
                                        ))}
                                        {food.length === 0 && <div className="text-slate-600 italic text-sm">Нет записей</div>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-slate-300 mb-3 border-b border-white/5 pb-2">Спорт</h3>
                                    <div className="space-y-2">
                                        {sport.map(s => (
                                            <div key={s.id} className="bg-slate-950/40 p-3 rounded border border-white/5">
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-slate-500">{s.details} {s.weight && `| ${s.weight}`}</div>
                                            </div>
                                        ))}
                                        {sport.length === 0 && <div className="text-slate-600 italic text-sm">Нет записей</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            Выберите дату
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    </div>
  );
};