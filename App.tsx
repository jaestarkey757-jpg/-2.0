import React, { useState, useEffect } from 'react';
import { repo } from './services/repository';
import { Sidebar } from './components/Sidebar';
import { SoundManager } from './components/SoundManager';
import { TasksPage } from './pages/Tasks';
import { CaloriesPage } from './pages/Calories';
import { SportPage } from './pages/Sport';
import { HabitsPage } from './pages/Habits';
import { ProfilePage } from './pages/Profile';
import { HistoryPage } from './pages/History';
import { StorePage } from './pages/Store';
import { InventoryPage } from './pages/Inventory';
import { RankUpModal } from './components/GameModals';
import { Task, FoodEntry, SportEntry, UserProfile, HABITS, RANKS } from './types';
import { Toaster, toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { DevMenuModal } from './components/DevMenuModal';

const ToastContainer = ({ toasts }: { toasts: { id: number, msg: string, type: string }[] }) => (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 ${
                t.type === 'achievement' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200' :
                t.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-200' :
                'bg-slate-800/90 border-white/10 text-white'
            }`}>
                {t.msg}
            </div>
        ))}
    </div>
);

const HISTORY_TAB = 99;
const PROFILE_TAB = 100;

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [previousTab, setPreviousTab] = useState(0); 
  const [dataVersion, setDataVersion] = useState(0); 
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);
  
  const [showRankUp, setShowRankUp] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showDevMenu, setShowDevMenu] = useState(false); 

  const today = new Date().toISOString().split('T')[0];
  
  const profile = { ...repo.getProfile() }; 
  const tasks = repo.getTasks();
  const foodEntries = repo.getFoodEntries(today);
  const sportEntries = repo.getSportEntries(today);
  const water = repo.getWater(today);
  const habits = repo.getHabits(today);
  const weightHistory = repo.getWeightHistory();
  const achievements = repo.getData().achievements;

  const refresh = () => {
      setDataVersion(v => v + 1);
      
      const currentRankIndex = RANKS.findIndex(r => r.title === RANKS.reduce((prev, curr) => (repo.getProfile().xp >= curr.threshold ? curr : prev), RANKS[0]).title);
      if (currentRankIndex > repo.getProfile().last_seen_rank_index) {
          setShowRankUp(currentRankIndex);
      }
  };

  useEffect(() => {
    try {
        localStorage.setItem('__test__', '1');
        localStorage.removeItem('__test__');
    } catch (e) {
        toast.error("ВНИМАНИЕ: Сохранение данных недоступно! Включите cookie/localStorage.", { duration: 10000 });
    }

    SoundManager.setNotifier((msg, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    });
    
    repo.checkDailyReset(); 
    repo.checkStreak();
    refresh();
    
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    const unlockAudio = () => {
        SoundManager.init();
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    const handleKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            SoundManager.playTypingSound();
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleMouseMove = (e: MouseEvent) => {
        setMousePos({ 
            x: (e.clientX / window.innerWidth) * 2 - 1, 
            y: (e.clientY / window.innerHeight) * 2 - 1 
        });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
        document.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const triggerConfetti = () => {
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#22d3ee', '#f472b6', '#fbbf24'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22d3ee', '#f472b6', '#fbbf24'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
  };

  const switchTo = (tab: number) => {
    setPreviousTab(currentTab);
    setCurrentTab(tab);
  };

  const goBack = () => {
    if (previousTab === HISTORY_TAB || previousTab === PROFILE_TAB) setCurrentTab(0);
    else setCurrentTab(previousTab);
  };

  // --- Actions ---
  const handleAddTask = (t: Omit<Task, 'id'>) => { repo.addTask(t); repo.addXp(10); SoundManager.playSuccess(); refresh(); };
  const handleUpdateTask = (t: Task) => { repo.updateTask(t); refresh(); };
  const handleDeleteTask = (id: number) => { repo.deleteTask(id); repo.addXp(-10); refresh(); };
  const handleCompleteTask = (id: number) => { 
      repo.completeTask(id, today); 
      SoundManager.playSuccess("Задача выполнена! +15 XP"); 
      triggerConfetti();
      refresh(); 
  };

  const handleAddFood = (f: Omit<FoodEntry, 'id'>) => {
    const prevTotal = repo.getFoodEntries(today).reduce((a,b) => a + b.kcal, 0);
    repo.addFood(f);
    const newTotal = repo.getFoodEntries(today).reduce((a,b) => a + b.kcal, 0);
    repo.addXp(5);
    SoundManager.playSuccess();
    
    if (prevTotal < 3000 && newTotal >= 3000) { triggerConfetti(); SoundManager.playGoal(); }
    if (newTotal >= 4000) checkAchievement('burnout');
    refresh();
  };

  const handleUpdateWater = (amount: number) => {
    const prevWater = repo.getWater(today);
    repo.setWater(today, amount);
    const diff = amount - prevWater;
    
    if (Math.abs(diff) >= 1) {
        const xpChange = Math.floor(diff / 250) * 2;
        if (xpChange !== 0) repo.addXp(xpChange);
    }
    if (prevWater < 3000 && amount >= 3000) { triggerConfetti(); SoundManager.playGoal(); }
    if (amount >= 4000) checkAchievement('hydro_homie');
    refresh();
  };
  
  const handleResetWater = () => {
      const prevWater = repo.getWater(today);
      if (prevWater > 0) {
          repo.setWater(today, 0);
          const xpToRemove = Math.floor(prevWater / 250) * 2;
          if (xpToRemove > 0) repo.addXp(-xpToRemove);
          refresh();
      }
  };

  // ИЗМЕНЕННАЯ ФУНКЦИЯ ДЛЯ СПОРТА: ТЕПЕРЬ ИНТЕНСИВНОСТЬ ДАЕТ РАЗНЫЙ XP!
  const handleAddSport = (s: Omit<SportEntry, 'id'>) => {
    repo.addSport(s); 
    
    // Смотрим, какая интенсивность спрятана в деталях
    let sportXp = 15; // По умолчанию (Средняя)
    if (s.details.includes('[Тяжелая]')) sportXp = 25;
    else if (s.details.includes('[Легкая]')) sportXp = 10;
    
    repo.addXp(sportXp); 
    SoundManager.playSuccess();
    
    if (repo.getSportEntries(today).length >= 5) checkAchievement('iron_temple');
    refresh();
  };

  const handleToggleHabit = (habit: string) => {
    const added = repo.toggleHabit(today, habit);
    if (added) {
        repo.addXp(10); SoundManager.playSuccess();
        if (repo.getHabits(today).length >= HABITS.length) { triggerConfetti(); checkAchievement('habit_god'); }
    } else {
        repo.addXp(-10);
    }
    refresh();
  };

  const handleUpdateProfile = (p: Partial<UserProfile>) => { repo.updateProfile(p); refresh(); };

  const handleBuyFreeze = () => {
    const success = repo.buyFreeze(500); 
    if (success) { SoundManager.playSuccess('Покупка совершена!'); refresh(); }
    return success;
  };
  
  const handleBuyGoldenDay = () => {
      const success = repo.buyGoldenDay(5000);
      if (success) { SoundManager.playSuccess('Золотые сутки активированы!'); triggerConfetti(); refresh(); }
      return success;
  }

  const checkAchievement = (code: string) => {
    if (repo.unlockAchievement(code)) { SoundManager.playAchievement(); triggerConfetti(); }
    if (repo.getProfile().xp >= 10000) checkAchievement('giga_chad');
    if (repo.getProfile().streak >= 30) checkAchievement('monk_mode');
  };

  useEffect(() => {
    const interval = setInterval(() => {
        repo.checkDailyReset(); 

        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        const currentTasks = repo.getTasks();
        const currentDayMask = 1 << (now.getDay() === 0 ? 6 : now.getDay() - 1);

        currentTasks.forEach(t => {
            if (!t.enabled || t.last_notified === today || ((t.days_mask & currentDayMask) === 0)) return;
            if (t.t_hhmm === timeStr) {
                t.last_notified = today;
                repo.updateTask(t);
                SoundManager.playNotification(t.title);
                toast(`⏰ ${t.title}`, { duration: 5000, icon: '⏰' });
                refresh();
            }
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [today]);

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans perspective-1000">
      <Sidebar 
        currentTab={currentTab} 
        onSwitch={(idx) => { setPreviousTab(idx); setCurrentTab(idx); }} 
        onProfileClick={() => switchTo(PROFILE_TAB)}
        profile={profile} 
        onSecretClick={() => setShowDevMenu(true)}
      />
      
      <main className="flex-1 p-6 relative overflow-hidden">
        {/* Parallax Background Blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none transition-transform duration-100 ease-out" style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none transition-transform duration-100 ease-out" style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }} />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-100 ease-out" style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }} />
        
        <div className="relative z-10 h-full">
            {currentTab === 0 && <TasksPage tasks={tasks} onAdd={handleAddTask} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onComplete={handleCompleteTask} />}
            {currentTab === 1 && <CaloriesPage entries={foodEntries} water={water} onAddFood={handleAddFood} onDeleteFood={(id) => { repo.deleteFood(id); repo.addXp(-5); refresh(); }} onUpdateWater={handleUpdateWater} onResetWater={handleResetWater} onGoToHistory={() => switchTo(HISTORY_TAB)} />}
            {currentTab === 2 && <SportPage entries={sportEntries} onAdd={handleAddSport} onDelete={(id) => { repo.deleteSport(id); repo.addXp(-15); refresh(); }} onGoToHistory={() => switchTo(HISTORY_TAB)} />}
            {currentTab === 3 && <HabitsPage completedHabits={habits} onToggle={handleToggleHabit} />}
            {currentTab === 4 && <StorePage profile={profile} onBuyFreeze={handleBuyFreeze} onBuyGoldenHour={handleBuyGoldenDay} />}
            {currentTab === 5 && <InventoryPage profile={profile} onRefresh={refresh} />}
            {currentTab === HISTORY_TAB && <HistoryPage onBack={goBack} />}
            {currentTab === PROFILE_TAB && <ProfilePage profile={profile} weightHistory={weightHistory} achievements={achievements} onUpdateProfile={handleUpdateProfile} onLogWeight={(w) => repo.logWeight(today, w)} onBack={goBack} />}
        </div>
      </main>
      
      {showRankUp !== null && (
          <RankUpModal 
             newRankIndex={showRankUp} 
             onClose={() => { repo.updateLastSeenRank(showRankUp); setShowRankUp(null); }} 
          />
      )}
      
      <ToastContainer toasts={toasts} />
      <Toaster position="top-center" />
      {showDevMenu && (
          <DevMenuModal 
              profile={profile} 
              onClose={() => setShowDevMenu(false)} 
              onRefresh={refresh} 
          />
      )}
    </div>
  );
};
export default App;