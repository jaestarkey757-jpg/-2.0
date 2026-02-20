import React from 'react';
import { HABITS } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { CheckCircle2, Circle } from 'lucide-react';

interface Props {
  completedHabits: string[];
  onToggle: (habit: string) => void;
}

export const HabitsPage: React.FC<Props> = ({ completedHabits, onToggle }) => {
  return (
    <div className="h-full flex flex-col">
        <div className="mb-4 shrink-0">
            <h2 className="text-2xl font-bold text-white mb-1">🧩 Трекер привычек</h2>
            <p className="text-slate-400 text-sm">Выполняйте ежедневные ритуалы.</p>
        </div>
        
        <GlassCard className="flex-1 overflow-hidden" noPadding>
            {/* Используем h-full и grid-cols-4. 
               13 привычек распределятся на 4 ряда (4+4+4+1).
               Каждый ряд будет занимать ровно 25% высоты виджета.
            */}
            <div className="h-full grid grid-cols-4 gap-[1px] bg-white/5">
                {HABITS.map(habit => {
                    const isDone = completedHabits.includes(habit);
                    return (
                        <button
                            key={habit}
                            onClick={() => onToggle(habit)}
                            className={`
                                flex flex-col items-center justify-center gap-2 transition-all duration-200 group h-full
                                ${isDone 
                                    ? 'bg-cyan-900/20 text-cyan-400' 
                                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                                }
                            `}
                        >
                            <div className={`transition-transform duration-300 ${isDone ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </div>
                            <span className="font-bold text-center px-2 text-xs leading-tight uppercase tracking-tight">
                                {habit}
                            </span>
                            
                            {isDone && (
                                <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
                            )}
                        </button>
                    );
                })}
                {/* Заполняем пустые ячейки для сохранения структуры сетки, если нужно */}
                {[...Array(3)].map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-900/40 opacity-20" />
                ))}
            </div>
        </GlassCard>
    </div>
  );
};