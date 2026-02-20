export interface Task {
  id: number;
  title: string;
  t_hhmm: string;
  days_mask: number; 
  enabled: boolean;
  notes: string;
  last_notified: string | null;
  last_completed?: string | null; // <-- НОВОЕ ПОЛЕ
}

export interface FoodEntry {
  id: number;
  date_str: string;
  phase: 'morning' | 'day' | 'evening';
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface SportEntry {
  id: number;
  date_str: string;
  name: string;
  details: string;
  weight: string;
}

export interface UserProfile {
  weight: number;
  body_fat: number;
  avatar_path: string;
  xp: number;
  coins: number;
  streak: number;
  has_freeze: boolean;
  golden_hour_expires: number | null;
  last_active: string;
  last_seen_rank_index: number;
  daily_xp: number;          
  last_daily_reset: string;  
  chest_inventory: ChestType[]; 
}

export interface PurchaseEntry {
  id: number;
  date_str: string;
  item_name: string;
  cost: number;
  category: 'bonus' | 'food' | 'dopamine';
}

export interface Achievement {
  code: string;
  name: string;
  desc: string;
}

export interface AppData {
  tasks: Task[];
  foodEntries: FoodEntry[];
  sportEntries: SportEntry[];
  waterEntries: Record<string, number>; 
  userProfile: UserProfile;
  weightLog: Record<string, number>; 
  habitEntries: { date_str: string; name: string }[];
  achievements: Record<string, string>; 
  purchaseHistory: PurchaseEntry[];
}

export enum ChestType {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
}

export enum RewardType {
  COINS = 'COINS',
  FREEZE = 'FREEZE',
  LIGHTNING = 'LIGHTNING',
}

export const RANKS = [
  { threshold: 0, title: "🪵 Дерево I", color: "from-amber-800 to-amber-600", cardBg: "bg-amber-900", cardBorder: "border-amber-800" },
  { threshold: 500, title: "🪵 Дерево II", color: "from-amber-700 to-amber-500", cardBg: "bg-amber-950", cardBorder: "border-amber-900" },
  { threshold: 1500, title: "🔩 Железо I", color: "from-slate-500 to-slate-400", cardBg: "bg-slate-700", cardBorder: "border-slate-600" },
  { threshold: 3000, title: "🔩 Железо II", color: "from-slate-400 to-slate-300", cardBg: "bg-slate-800", cardBorder: "border-slate-700" },
  { threshold: 6000, title: "🥉 Бронза", color: "from-orange-700 to-orange-500", cardBg: "bg-orange-900", cardBorder: "border-orange-800" },
  { threshold: 12000, title: "🥈 Серебро", color: "from-gray-300 to-gray-100", cardBg: "bg-zinc-700", cardBorder: "border-zinc-600" },
  { threshold: 25000, title: "🥇 Золото", color: "from-yellow-500 to-yellow-300", cardBg: "bg-yellow-900", cardBorder: "border-yellow-800" },
  { threshold: 50000, title: "💠 Алмаз", color: "from-cyan-500 to-cyan-300", cardBg: "bg-cyan-900", cardBorder: "border-cyan-800" },
  { threshold: 100000, title: "👑 Мастер", color: "from-purple-600 to-purple-400", cardBg: "bg-purple-900", cardBorder: "border-purple-800" },
  { threshold: 250000, title: "💎 Global Elite", color: "from-rose-600 to-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)]", cardBg: "bg-rose-900", cardBorder: "border-rose-800" }
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { code: "monk_mode", name: "Монах", desc: "Стрик 30 дней подряд" },
  { code: "giga_chad", name: "Гигачад", desc: "Набрать 50 000 XP" },
  { code: "burnout", name: "Топка", desc: "Съесть 4000+ ккал за день" },
  { code: "hydro_homie", name: "Водокачка", desc: "Выпить 4 литра воды" },
  { code: "iron_temple", name: "Храм железа", desc: "5 записей спорта за день" },
  { code: "habit_god", name: "Бог привычек", desc: "Выполнить все привычки за день" },
  { code: "early_riser", name: "5 утра", desc: "Выполнить утреннюю рутину до 6:00" },
  { code: "night_watch", name: "Ночной дожор", desc: "Поесть после 23:00" },
  { code: "marathon", name: "Марафонец", desc: "Стрик 100 дней" },
  { code: "completionist", name: "Перфекционист", desc: "Выполнить все задачи на день" }
];

export const HABITS = [
  "Золофт", "CS 2", "Clash Royale", "Самоанализ", "Дискретизация",
  "Чистка зубов", "Стикер", "Рари Брик", "Айсберги", "Креатин",
  "Цитруллин", "Узнать новое", "Общение", "Гитара", "Скороговорки"
];

export enum AppState {
  MENU = 'MENU',
  IDLE = 'IDLE',
  OPENING = 'OPENING',
  OPENED = 'OPENED'
}

export interface Reward {
  type: RewardType;
  amount: number;
}

export interface CoinData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}