import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { Plus, Trash2, Edit3, Power, Check, LayoutDashboard, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  tasks: Task[];
  onAdd: (t: Omit<Task, 'id'>) => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void; 
}

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Статусы задачи для визуализации
type TaskStatus = 'upcoming' | 'missed' | 'completed' | 'disabled';

export const TasksPage: React.FC<Props> = ({ tasks, onAdd, onUpdate, onDelete, onComplete }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Устанавливаем начальный выбор на первую актуальную задачу, если ничего не выбрано
  useEffect(() => {
    if (!selectedId && tasks.length > 0) {
      const sorted = getSortedTasks();
      if (sorted.length > 0) setSelectedId(sorted[0].id);
    }
  }, [tasks]);

  const getLogicalDate = () => {
    const d = new Date(now);
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getTaskStatus = (task: Task): TaskStatus => {
    if (!task.enabled) return 'disabled';
    
    const todayStr = getLogicalDate();
    const currentMaskIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const isToday = (task.days_mask & (1 << currentMaskIdx)) !== 0;

    if (!isToday) return 'disabled';
    if (task.last_completed === todayStr) return 'completed';

    const [h, m] = task.t_hhmm.split(':').map(Number);
    const taskTime = new Date(now);
    if (now.getHours() < 4) taskTime.setDate(taskTime.getDate() - 1);
    taskTime.setHours(h, m, 0, 0);

    return now > taskTime ? 'missed' : 'upcoming';
  };

  const getSortedTasks = () => {
    return [...tasks].sort((a, b) => {
      const statusA = getTaskStatus(a);
      const statusB = getTaskStatus(b);
      
      const weights: Record<TaskStatus, number> = { 
        upcoming: 0, 
        missed: 1, 
        completed: 2, 
        disabled: 3 
      };

      if (weights[statusA] !== weights[statusB]) {
        return weights[statusA] - weights[statusB];
      }
      return a.t_hhmm.localeCompare(b.t_hhmm);
    });
  };

  const selectedTask = tasks.find(t => t.id === selectedId);

  const getDaysString = (mask: number) => {
    if (mask === 0) return "—";
    if (mask === 127) return "Каждый день";
    return DAYS.filter((_, i) => (mask & (1 << i))).join(", ");
  };

  const getTimeRemaining = (task: Task) => {
    if (!task.enabled) return { text: "Отключено", color: "text-slate-600" };
    
    const status = getTaskStatus(task);
    if (status === 'completed') return { text: "Выполнено", color: "text-green-400" };
    if (status === 'missed') return { text: "Пропущено", color: "text-red-400" };

    const [h, m] = task.t_hhmm.split(':').map(Number);
    const currentMaskIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

    let daysUntil = -1;
    let nextDate = new Date(now);

    const isTodayInMask = (task.days_mask & (1 << currentMaskIdx)) !== 0;
    const taskTimeToday = new Date(now);
    taskTimeToday.setHours(h, m, 0, 0);

    if (isTodayInMask && taskTimeToday > now) {
        daysUntil = 0;
        nextDate = taskTimeToday;
    } else {
        for (let i = 1; i <= 7; i++) {
            const nextIdx = (currentMaskIdx + i) % 7;
            if ((task.days_mask & (1 << nextIdx)) !== 0) {
                daysUntil = i;
                nextDate = new Date(now);
                nextDate.setDate(now.getDate() + i);
                nextDate.setHours(h, m, 0, 0);
                break;
            }
        }
    }

    if (daysUntil === -1) return { text: "Нет дней", color: "text-slate-600" };

    const diffMs = nextDate.getTime() - now.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const d = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    let text = "";
    if (d > 0) text = `${d}д ${hours}ч`;
    else if (hours > 0) text = `${hours}ч ${mins}м`;
    else text = `${mins}м ${secs}с`;

    let color = "text-slate-400";
    if (d === 0 && hours < 1) color = "text-yellow-400 animate-pulse";
    if (d === 0 && hours === 0 && mins < 5) color = "text-red-400 animate-pulse";

    return { text, color };
  };

  const handleEdit = () => {
    if (!selectedTask) return;
    setEditingTask(selectedTask);
    setModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedTask) return;
    
    if (window.confirm(`Вы уверены, что хотите удалить «${selectedTask.title}»?`)) {
      onDelete(selectedTask.id);
      setSelectedId(null);
      toast.success("Задача удалена");
    }
  };

  const handleToggle = () => {
    if (!selectedTask) return;
    onUpdate({ ...selectedTask, enabled: !selectedTask.enabled });
  };

  const handleSave = (taskData: Omit<Task, 'id'>, id?: number) => {
    if (id) {
      onUpdate({ ...taskData, id });
    } else {
      onAdd(taskData);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const sortedTasks = getSortedTasks();

  return (
    <div className="flex h-full gap-6">
      <div className="w-5/12 flex flex-col gap-4">
        <GlassCard className="flex-1 flex flex-col" noPadding>
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <h2 className="font-semibold text-lg">📅 Расписание</h2>
                <Button variant="primary" onClick={() => { setEditingTask(null); setModalOpen(true); }} className="px-3 py-1 text-sm">
                    <Plus size={16} />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {tasks.length === 0 && <div className="text-center text-slate-500 py-10">Задач пока нет</div>}
                {sortedTasks.map(t => {
                    const status = getTaskStatus(t);
                    const countdown = getTimeRemaining(t);
                    const isActive = selectedId === t.id;

                    const statusStyles: Record<TaskStatus, string> = {
                      completed: 'bg-green-500/10 border-green-500/30 text-green-200',
                      missed: 'bg-red-500/10 border-red-500/30 text-red-200',
                      upcoming: isActive ? 'bg-cyan-500/20 border-cyan-500/50' : 'hover:bg-white/5 border-transparent',
                      disabled: 'opacity-40 grayscale-[0.5]'
                    };

                    return (
                        <div 
                            key={t.id}
                            onClick={() => setSelectedId(t.id)}
                            className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all border ${statusStyles[status]}`}
                        >
                            <div className={`w-3 h-3 rounded-full shrink-0 ${
                                status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' :
                                status === 'missed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                                t.enabled ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-slate-600'
                            }`} />
                            <div className="flex flex-col">
                                <span className={`font-mono text-sm leading-none ${status === 'upcoming' ? 'text-cyan-200' : ''}`}>
                                  {t.t_hhmm}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-medium text-sm">{t.title}</div>
                                <div className={`text-[10px] flex items-center gap-1 ${countdown.color}`}>
                                    {status === 'upcoming' && <Clock size={10} />}
                                    {status === 'missed' && <AlertCircle size={10} />}
                                    {status === 'completed' && <Check size={10} />}
                                    {countdown.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
      </div>

      <div className="w-7/12 flex flex-col">
        <GlassCard className="flex-1 flex flex-col">
            {selectedTask ? (
                <>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h2>
                            <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                                <span className="bg-slate-950 px-2 py-1 rounded border border-white/10">{selectedTask.t_hhmm}</span>
                                <span className="bg-slate-950 px-2 py-1 rounded border border-white/10">{getDaysString(selectedTask.days_mask)}</span>
                                <span className={`px-2 py-1 rounded border border-white/10 ${selectedTask.enabled ? 'text-green-400 bg-green-900/20' : 'text-slate-500'}`}>
                                    {selectedTask.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-950 px-4 py-3 rounded-xl text-right border border-white/5 shadow-inner">
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Статус</div>
                             <div className={`font-mono font-bold text-lg ${getTimeRemaining(selectedTask).color}`}>
                                {getTimeRemaining(selectedTask).text}
                             </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950/30 rounded-xl p-4 border border-white/5 flex-1 mb-6 overflow-y-auto">
                        <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-bold">Заметки</h3>
                        <p className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed">
                          {selectedTask.notes || "Заметок нет."}
                        </p>
                    </div>

                    {(() => {
                        const status = getTaskStatus(selectedTask);
                        
                        if (status === 'upcoming' || status === 'missed') {
                            return (
                                <Button 
                                    onClick={() => onComplete(selectedTask.id)} 
                                    variant="primary" 
                                    className={`w-full mb-3 py-4 text-lg font-bold shadow-lg transition-all ${
                                      status === 'missed' 
                                      ? 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30' 
                                      : 'bg-green-600 hover:bg-green-500 text-white border-green-500/50'
                                    }`}
                                >
                                    <Check size={20} /> 
                                    {status === 'missed' ? 'Закрыть долг (+15 XP)' : 'Отметить выполненным (+15 XP)'}
                                </Button>
                            );
                        } else if (status === 'completed') {
                            return (
                                <div className="w-full bg-green-950/30 border border-green-500/30 text-green-400 rounded-xl flex items-center justify-center gap-2 mb-3 py-4 font-bold animate-in fade-in zoom-in-95">
                                    <Check size={20} /> Завершено сегодня
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="flex gap-3">
                        <Button onClick={handleToggle} variant="secondary" className="flex-1 h-12">
                            <Power size={18} className={selectedTask.enabled ? "text-green-400" : "text-slate-400"} />
                            {selectedTask.enabled ? "Выкл" : "Вкл"}
                        </Button>
                        <Button onClick={handleEdit} variant="secondary" className="flex-1 h-12">
                            <Edit3 size={18} /> Правка
                        </Button>
                        <Button onClick={handleDelete} variant="danger" className="flex-1 h-12">
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <LayoutDashboard size={64} className="mb-4 opacity-10" />
                    <p className="font-medium">Выберите задачу для просмотра деталей</p>
                </div>
            )}
        </GlassCard>
      </div>

      {isModalOpen && (
        <TaskModal 
            task={editingTask} 
            onClose={() => setModalOpen(false)} 
            onSave={handleSave} 
        />
      )}
    </div>
  );
};

const TaskModal: React.FC<{ task: Task | null, onClose: () => void, onSave: (t: Omit<Task, 'id'>, id?: number) => void }> = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [time, setTime] = useState(task?.t_hhmm || '12:00');
    const [days, setDays] = useState(task?.days_mask ?? 127);
    const [enabled, setEnabled] = useState(task?.enabled ?? true);
    const [notes, setNotes] = useState(task?.notes || '');

    const toggleDay = (idx: number) => {
        setDays(prev => prev ^ (1 << idx));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="w-full max-w-md animate-in fade-in zoom-in duration-200 border-white/20">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <Edit3 size={20} className="text-cyan-400" />
                  {task ? 'Редактирование' : 'Новая активность'}
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Название</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all" placeholder="Напр: Тренировка ног" />
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Время</label>
                          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all" />
                      </div>
                      <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-4 py-3 rounded-xl border border-white/5 hover:bg-slate-800 transition-colors">
                              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4 rounded accent-cyan-500" />
                              <span className="text-sm font-bold text-slate-300">Активна</span>
                          </label>
                      </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Дни повторения</label>
                        <div className="flex justify-between gap-1.5">
                            {DAYS.map((d, i) => {
                                const active = (days & (1 << i)) !== 0;
                                return (
                                    <button 
                                        key={d} 
                                        type="button"
                                        onClick={() => toggleDay(i)}
                                        className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all border ${active ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-950 text-slate-500 border-white/5 hover:bg-slate-900'}`}
                                    >
                                        {d}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Заметки и детали</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none h-28 resize-none text-sm transition-all" placeholder="Дополнительная информация..." />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <Button variant="ghost" onClick={onClose} className="px-6">Отмена</Button>
                    <Button variant="primary" className="px-8 bg-cyan-600 hover:bg-cyan-500 text-white border-none shadow-lg" onClick={() => {
                        if (!title.trim()) return toast.error('Введите название');
                        onSave({
                            title: title.trim(),
                            t_hhmm: time,
                            days_mask: days,
                            enabled,
                            notes,
                            last_notified: task?.last_notified || null
                        }, task?.id);
                    }}>Сохранить</Button>
                </div>
            </GlassCard>
        </div>
    );
};