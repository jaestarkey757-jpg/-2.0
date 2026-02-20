import { AppData, Task, UserProfile, FoodEntry, SportEntry, RANKS, PurchaseEntry, ChestType, RewardType, HABITS } from '../types';

const DB_KEY = 'daily_organizer_db_v1';

const DEFAULT_PROFILE: UserProfile = {
  weight: 0,
  body_fat: 0,
  avatar_path: '',
  xp: 0,
  coins: 0,
  streak: 0,
  has_freeze: false,
  golden_hour_expires: null,
  last_active: '',
  last_seen_rank_index: 0,
  daily_xp: 0,
  last_daily_reset: '',
  chest_inventory: []
};

const getInitialData = (): AppData => ({
  tasks: [],
  foodEntries: [],
  sportEntries: [],
  waterEntries: {},
  userProfile: { ...DEFAULT_PROFILE },
  weightLog: {},
  habitEntries: [],
  achievements: {},
  purchaseHistory: []
});

export class Repository {
  private data: AppData;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.data = { ...getInitialData(), ...parsed };
        this.data.userProfile = { ...DEFAULT_PROFILE, ...(parsed.userProfile || {}) };
        
        if (!Array.isArray(this.data.tasks)) this.data.tasks = [];
        if (!Array.isArray(this.data.foodEntries)) this.data.foodEntries = [];
        if (!Array.isArray(this.data.sportEntries)) this.data.sportEntries = [];
        if (!Array.isArray(this.data.habitEntries)) this.data.habitEntries = [];
        if (!Array.isArray(this.data.purchaseHistory)) this.data.purchaseHistory = [];
        if (!Array.isArray(this.data.userProfile.chest_inventory)) this.data.userProfile.chest_inventory = [];
        if (typeof this.data.waterEntries !== 'object' || this.data.waterEntries === null) this.data.waterEntries = {};
        if (typeof this.data.weightLog !== 'object' || this.data.weightLog === null) this.data.weightLog = {};
        if (typeof this.data.achievements !== 'object' || this.data.achievements === null) this.data.achievements = {};
      } catch (e) {
        this.data = getInitialData();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  private save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("CRITICAL: Failed to save data", e);
    }
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  importData(jsonString: string): boolean {
      try {
          const parsed = JSON.parse(jsonString);
          if (!parsed.userProfile || !Array.isArray(parsed.tasks)) throw new Error("Invalid structure");
          this.data = { ...getInitialData(), ...parsed };
          this.save();
          return true;
      } catch (e) {
          return false;
      }
  }

  getData(): AppData { return { ...this.data }; }
  getTasks(): Task[] { return [...this.data.tasks].sort((a, b) => a.t_hhmm.localeCompare(b.t_hhmm)); }
  getFoodEntries(date: string): FoodEntry[] { return this.data.foodEntries.filter(e => e.date_str === date); }
  getSportEntries(date: string): SportEntry[] { return this.data.sportEntries.filter(e => e.date_str === date); }
  getWater(date: string): number { return this.data.waterEntries[date] || 0; }
  getHabits(date: string): string[] { return this.data.habitEntries.filter(h => h.date_str === date).map(h => h.name); }
  getProfile(): UserProfile { return this.data.userProfile; }
  getWeightHistory(): { date: string, weight: number }[] {
    return Object.entries(this.data.weightLog)
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  getHistoryDates(): string[] {
    const dates = new Set<string>();
    this.data.foodEntries.forEach(e => dates.add(e.date_str));
    this.data.sportEntries.forEach(e => dates.add(e.date_str));
    Object.keys(this.data.waterEntries).forEach(d => dates.add(d));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }
  getPurchaseHistory(): PurchaseEntry[] { return [...this.data.purchaseHistory].sort((a, b) => b.id - a.id); }

  addTask(task: Omit<Task, 'id'>) {
    const id = Date.now();
    this.data.tasks.push({ ...task, id });
    this.save();
    return id;
  }
  updateTask(task: Task) {
    const idx = this.data.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) { this.data.tasks[idx] = task; this.save(); }
  }
  deleteTask(id: number) { this.data.tasks = this.data.tasks.filter(t => t.id !== id); this.save(); }
  addFood(entry: Omit<FoodEntry, 'id'>) {
    const id = Date.now();
    this.data.foodEntries.push({ ...entry, id });
    this.save();
    return id;
  }
  completeTask(id: number, dateStr: string) {
      const task = this.data.tasks.find(t => t.id === id);
      if (task && task.last_completed !== dateStr) {
          task.last_completed = dateStr;
          this.addXp(15); // Награда за выполнение задачи в срок
          this.save();
      }
  }
  deleteFood(id: number) { this.data.foodEntries = this.data.foodEntries.filter(f => f.id !== id); this.save(); }
  addSport(entry: Omit<SportEntry, 'id'>) {
    const id = Date.now();
    this.data.sportEntries.push({ ...entry, id });
    this.save();
    return id;
  }
  deleteSport(id: number) { this.data.sportEntries = this.data.sportEntries.filter(s => s.id !== id); this.save(); }
  setWater(date: string, amount: number) { this.data.waterEntries[date] = amount; this.save(); }
  toggleHabit(date: string, name: string): boolean {
    const idx = this.data.habitEntries.findIndex(h => h.date_str === date && h.name === name);
    if (idx !== -1) { this.data.habitEntries.splice(idx, 1); this.save(); return false; }
    else { this.data.habitEntries.push({ date_str: date, name }); this.save(); return true; }
  }

  // В файле services/repository.ts

  updateProfile(p: Partial<UserProfile>) {
    // ВАЖНО: Мы создаем совершенно новую копию объекта this.data.
    // Это сигнал для React, что данные изменились и нужно обновить Sidebar.
    this.data = {
      ...this.data,
      userProfile: { 
        ...this.data.userProfile, 
        ...p 
      }
    };
    this.save();
  }
  updateLastSeenRank(idx: number) { this.data.userProfile.last_seen_rank_index = idx; this.save(); }
  logWeight(date: string, weight: number) { this.data.weightLog[date] = weight; this.save(); }

  addXp(amount: number) {
    let finalAmount = amount;
    if (this.data.userProfile.golden_hour_expires && Date.now() < this.data.userProfile.golden_hour_expires) finalAmount = amount * 2;
    this.data.userProfile.xp += finalAmount;
    // this.data.userProfile.coins += finalAmount;
    this.data.userProfile.daily_xp += finalAmount;
    if (this.data.userProfile.xp < 0) this.data.userProfile.xp = 0;
    if (this.data.userProfile.coins < 0) this.data.userProfile.coins = 0;
    this.data.userProfile.daily_xp = Math.max(0, this.data.userProfile.daily_xp);
    this.save();
    return finalAmount;
  }

  private addPurchaseLog(item_name: string, cost: number, category: 'bonus' | 'food' | 'dopamine') {
      const entry: PurchaseEntry = {
          id: Date.now() + Math.random(),
          date_str: new Date().toISOString().split('T')[0],
          item_name,
          cost,
          category
      };
      this.data.purchaseHistory.push(entry);
      if (this.data.purchaseHistory.length > 100) this.data.purchaseHistory.shift();
  }

  deletePurchaseEntry(id: number) {
      this.data.purchaseHistory = this.data.purchaseHistory.filter(p => p.id !== id);
      this.save();
  }

  buyFreeze(cost: number): boolean {
    if (this.data.userProfile.coins >= cost) {
      this.data.userProfile.coins -= cost;
      this.data.userProfile.has_freeze = true;
      this.addPurchaseLog('Заморозка стрика', cost, 'bonus');
      this.save();
      return true;
    }
    return false;
  }

  buyGoldenDay(cost: number): boolean {
    if (this.data.userProfile.coins >= cost) {
      this.data.userProfile.coins -= cost;
      this.data.userProfile.golden_hour_expires = Date.now() + (24 * 60 * 60 * 1000); 
      this.addPurchaseLog('Золотые сутки', cost, 'bonus');
      this.save();
      return true;
    }
    return false;
  }

  buyReward(name: string, cost: number, category: 'food' | 'dopamine'): boolean {
      if (this.data.userProfile.coins >= cost) {
          this.data.userProfile.coins -= cost;
          this.addPurchaseLog(name, cost, category);
          this.save();
          return true;
      }
      return false;
  }

  unlockAchievement(code: string): boolean {
    if (this.data.achievements[code]) return false;
    this.data.achievements[code] = new Date().toISOString().split('T')[0];
    this.save();
    return true;
  }

  setAchievements(achievements: Record<string, string>) {
    this.data.achievements = achievements;
    this.save();
  }

  private getLogicalDate(): string {
      const d = new Date();
      d.setHours(d.getHours() - 4); 
      return d.toISOString().split('T')[0];
  }

  checkDailyReset() {
      const todayStr = this.getLogicalDate();
      const p = this.data.userProfile;
      
      if (!p.last_daily_reset) { 
          p.last_daily_reset = todayStr; 
          this.save(); 
          return; 
      }
      
      if (p.last_daily_reset !== todayStr) {
          const prevDate = p.last_daily_reset;
          
          // --- 1. ШТРАФ ЗА ПРИВЫЧКИ (ваш предыдущий код) ---
          const completedHabitsCount = this.getHabits(prevDate).length;
          const missedHabitsCount = HABITS.length - completedHabitsCount;
          if (missedHabitsCount > 0) {
              const penalty = Math.floor((missedHabitsCount * 10) / 2);
              p.xp = Math.max(0, p.xp - penalty);
          }

          // --- 2. ШТРАФ ЗА ИГНОРИРОВАНИЕ ЗАДАЧ ---
          // Если уведомление было вчера, но задача так и не была выполнена
          const missedTasks = this.data.tasks.filter(t => 
              t.last_notified === prevDate && t.last_completed !== prevDate
          );
          if (missedTasks.length > 0) {
              const taskPenalty = missedTasks.length * 15; // Штраф 15 XP за каждую пропущенную
              p.xp = Math.max(0, p.xp - taskPenalty);
          }

          // --- 3. ПРОПОРЦИОНАЛЬНЫЙ ШТРАФ ЗА ВОДУ И КАЛОРИИ ---
          const prevWater = this.getWater(prevDate);
          const prevFood = this.getFoodEntries(prevDate);
          const prevKcal = prevFood.reduce((sum, f) => sum + f.kcal, 0);

          const MAX_WATER_PENALTY = 30; // Максимальный штраф, если воды 0
          const MAX_KCAL_PENALTY = 50;  // Максимальный штраф, если съедено 0 ккал

          // Вода (цель 3000)
          if (prevWater < 3000) {
              const deficitRatio = (3000 - prevWater) / 3000; // от 0.0 до 1.0
              const waterPenalty = Math.floor(deficitRatio * MAX_WATER_PENALTY);
              p.xp = Math.max(0, p.xp - waterPenalty);
          }

          // Калории (цель 4000)
          if (prevKcal < 4000) {
              const deficitRatio = (4000 - prevKcal) / 4000; // от 0.0 до 1.0
              const kcalPenalty = Math.floor(deficitRatio * MAX_KCAL_PENALTY);
              p.xp = Math.max(0, p.xp - kcalPenalty);
          }

          // Выдача сундуков
          let awardedChest: ChestType | null = null;
          if (p.daily_xp >= 600) awardedChest = ChestType.EPIC;
          else if (p.daily_xp >= 300) awardedChest = ChestType.RARE;
          else if (p.daily_xp >= 100) awardedChest = ChestType.COMMON;
          if (awardedChest) p.chest_inventory.push(awardedChest);
          
          p.daily_xp = 0;
          p.last_daily_reset = todayStr;
          
          this.save();
      }
  }
 
  processChestReward(chestIndex: number, type: RewardType, amount: number) {
      const p = this.data.userProfile;
      if (chestIndex >= 0 && chestIndex < p.chest_inventory.length) p.chest_inventory.splice(chestIndex, 1);
      if (type === RewardType.COINS) p.coins += amount;
      else if (type === RewardType.FREEZE) p.has_freeze = true;
      else if (type === RewardType.LIGHTNING) {
          const currentExpires = p.golden_hour_expires && p.golden_hour_expires > Date.now() ? p.golden_hour_expires : Date.now();
          p.golden_hour_expires = currentExpires + (24 * 60 * 60 * 1000);
      }
      this.save();
  }

  checkStreak() {
    this.checkDailyReset();
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    const p = this.data.userProfile;
    if (p.last_active === today) return;
    if (p.last_active === yesterday) p.streak += 1;
    else {
      if (p.has_freeze) { p.has_freeze = false; p.streak += 1; }
      else p.streak = 1;
    }
    p.last_active = today;
    this.save();
  }
}

export const repo = new Repository();