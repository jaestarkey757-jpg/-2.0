import React, { useState, useEffect, useRef } from 'react';
import { GlassCard, Button } from '../components/ui/GlassCard';
import { UserProfile, PurchaseEntry } from '../types';
import { 
    ShoppingBag, Snowflake, Coins, Zap, Pizza, Sandwich, 
    History, Scroll, Fish, Beef, Utensils, CupSoda, 
    Candy, Lock, Film, Tv, Youtube, Smartphone, Flame,
    Minus, Plus, ShoppingCart, Trash2, Moon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { repo } from '../services/repository';

interface Props {
  profile: UserProfile;
  onBuyFreeze: () => boolean;
  onBuyGoldenHour: () => boolean; 
}

const FOOD_ITEMS = [
    { name: "Сочная Пицца", icon: Pizza, cost: 500, desc: "Итальянская классика для души." },
    { name: "Мощный Бургер", icon: Sandwich, cost: 450, desc: "Вкуснейшая котлета с сыром." },
    { name: "Сытная Шаурма", icon: Scroll, cost: 300, desc: "Пища богов." },
    { name: "Сет Суши", icon: Fish, cost: 800, desc: "Премиум роллы для восстановления." },
    { name: "Стейк Рибай", icon: Beef, cost: 1200, desc: "Мясо для настоящего хищника." },
    { name: "Банка Колы", icon: CupSoda, cost: 150, desc: "Ледяная и освежающая." },
    { name: "Шоколадка", icon: Candy, cost: 100, desc: "Быстрая энергия и эндорфины." },
];

const DOPAMINE_ITEMS = [
    { name: "Посмотреть фильм", icon: Film, cost: 500, desc: "Полноценный отдых на 2 часа." },
    { name: "Серия сериала", icon: Tv, cost: 300, desc: "Короткий эпизод любимого шоу." },
    { name: "Ролик YouTube", icon: Youtube, cost: 100, desc: "Познавательный или смешной контент." },
    { name: "YT Shorts (30 мин)", icon: Zap, cost: 300, desc: "Быстрый дофамин по таймеру." },
    { name: "Зарядить телефон", icon: Smartphone, cost: 30, desc: "Ритуал полной зарядки устройства." },
    { name: "Мастурбация", icon: Flame, cost: 300, desc: "Мгновенная разрядка." },
    { name: "Дневной сон", icon: Moon, cost: 300, desc: "Перезагрузка мозга и восстановление сил." },
];

const SORTED_FOOD = [...FOOD_ITEMS].sort((a, b) => a.cost - b.cost);
const SORTED_DOPAMINE = [...DOPAMINE_ITEMS].sort((a, b) => a.cost - b.cost);

interface CartItem {
    name: string;
    cost: number;
    category: 'bonus' | 'food' | 'dopamine';
    qty: number;
}

export const StorePage: React.FC<Props> = ({ profile, onBuyFreeze, onBuyGoldenHour }) => {
  const [tab, setTab] = useState<'bonus' | 'food' | 'dopamine' | 'history'>('bonus');
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseEntry[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.qty), 0);

  const [pin, setPin] = useState(['', '', '', '']);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (tab !== 'dopamine') { setIsUnlocked(false); setPin(['', '', '', '']); }
    setPurchaseHistory(repo.getPurchaseHistory());
  }, [tab, profile.coins]);

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
        if (profile.golden_hour_expires && profile.golden_hour_expires > Date.now()) {
            const diff = Math.floor((profile.golden_hour_expires - Date.now()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else setTimeLeft(null);
    }, 1000);
    return () => clearInterval(interval);
  }, [profile.golden_hour_expires]);

  const handlePinChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const newPin = [...pin];
    newPin[idx] = val;
    setPin(newPin);
    if (val && idx < 3) pinRefs[idx + 1].current?.focus();
  };

  const checkPin = () => {
    const now = new Date();
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    if (pin.join('') === currentTimeStr) { setIsUnlocked(true); toast.success("Доступ разрешен", { icon: '🔓' }); }
    else { toast.error("Неверный код"); setPin(['', '', '', '']); pinRefs[0].current?.focus(); }
  };

  const addToCart = (name: string, cost: number, category: 'bonus' | 'food' | 'dopamine', maxQty?: number) => {
    setCart(prev => {
        const existing = prev.find(i => i.name === name);
        if (existing) {
            if (maxQty && existing.qty >= maxQty) return prev;
            return prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { name, cost, category, qty: 1 }];
    });
  };

  const removeFromCart = (name: string) => {
    setCart(prev => {
        const existing = prev.find(i => i.name === name);
        if (existing && existing.qty > 1) return prev.map(i => i.name === name ? { ...i, qty: i.qty - 1 } : i);
        return prev.filter(i => i.name !== name);
    });
  };

  const handleCheckout = () => {
    if (totalCost > profile.coins) { toast.error("Недостаточно средств!"); return; }
    let successCount = 0;
    
    // Подтягиваем старые награды
    const existing = localStorage.getItem('user_purchased_rewards');
    const purchasedRewards = existing ? JSON.parse(existing) : [];

    cart.forEach(item => {
        for (let i = 0; i < item.qty; i++) {
            if (item.category === 'bonus') {
                if (item.name === 'Заморозка стрика' && onBuyFreeze()) successCount++;
                if (item.name === 'Золотые сутки' && onBuyGoldenHour()) successCount++;
            } else {
                if (repo.buyReward(item.name, item.cost, item.category as any)) {
                    successCount++;
                    // Добавляем предмет в массив на 24 часа
                    purchasedRewards.push({
                        id: `${Date.now()}_${Math.random()}`,
                        name: item.name,
                        category: item.category,
                        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
                    });
                }
            }
        }
    });

    if (successCount > 0) {
        toast.success(`Куплено товаров: ${successCount}`);
        setCart([]);
        // Сохраняем и вызываем событие, чтобы Инвентарь обновился (если они открыты в соседних вкладках, хотя и без этого при переходе сработает)
        localStorage.setItem('user_purchased_rewards', JSON.stringify(purchasedRewards));
        window.dispatchEvent(new Event('storage'));
        setPurchaseHistory(repo.getPurchaseHistory());
    }
};

  const deleteHistoryEntry = (id: number) => {
      if (window.confirm("Удалить запись из истории?")) {
          repo.deletePurchaseEntry(id);
          setPurchaseHistory(repo.getPurchaseHistory());
          toast.success("Запись удалена");
      }
  };

  const renderItemAction = (name: string, cost: number, category: 'bonus' | 'food' | 'dopamine', maxQty?: number) => {
      const qty = cart.find(i => i.name === name)?.qty || 0;
      if (qty > 0) {
          return (
              <div className="flex items-center justify-between w-full bg-slate-900 rounded-lg p-1 border border-cyan-500/30 h-10 mt-auto">
                  <button onClick={() => removeFromCart(name)} className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"><Minus size={16}/></button>
                  <span className="font-bold text-white text-sm">{qty} шт</span>
                  <button onClick={() => addToCart(name, cost, category, maxQty)} disabled={maxQty ? qty >= maxQty : false} className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30"><Plus size={16}/></button>
              </div>
          )
      }
      return (
          <Button onClick={() => addToCart(name, cost, category, maxQty)} className="w-full h-10 bg-slate-800 hover:bg-slate-700 transition-colors mt-auto">
              <div className="flex items-center gap-1">{cost} <Coins size={14} className="text-yellow-400"/></div>
          </Button>
      )
  };

  return (
    <div className="h-full flex flex-col relative">
       <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><ShoppingBag className="text-purple-400" /> Магазин</h2>
            <p className="text-slate-400 text-sm">Награды за ваши труды.</p>
          </div>
          <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-inner">
              <Coins className="text-yellow-400" size={20} />
              <span className="text-xl font-bold font-mono text-yellow-100">{profile.coins}</span>
          </div>
       </div>

       <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0 custom-scrollbar">
           {[ {id:'bonus', icon: Zap, label:'Бонусы', color:'bg-purple-600'}, {id:'food', icon: Utensils, label:'Еда и напитки', color:'bg-orange-600'}, {id:'dopamine', icon: Lock, label:'Дофамин', color:'bg-rose-600'}, {id:'history', icon: History, label:'История', color:'bg-slate-600'}].map(t => (
               <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${tab === t.id ? `${t.color} text-white` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                   <t.icon size={16} /> {t.label}
               </button>
           ))}
       </div>

       <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar relative min-h-0 pr-2">
           {tab === 'bonus' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GlassCard className="flex flex-col items-center text-center h-full">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${profile.has_freeze ? 'bg-slate-700/50 grayscale opacity-50' : 'bg-blue-500/20'}`}><Snowflake size={40} className="text-blue-300" /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Заморозка стрика</h3>
                        <p className="text-xs text-slate-400 mb-6 flex-1">Пропуск дня без потери серии.</p>
                        <div className="w-full mt-auto">{profile.has_freeze ? <Button disabled className="w-full opacity-50 bg-slate-800">Куплено</Button> : renderItemAction('Заморозка стрика', 500, 'bonus', 1)}</div>
                    </GlassCard>
                    <GlassCard className="flex flex-col items-center text-center h-full relative">
                        {timeLeft && <div className="absolute top-0 inset-x-0 bg-yellow-500/20 text-yellow-200 text-[10px] font-bold text-center py-1 uppercase">Активно: {timeLeft}</div>}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 mt-2 ${timeLeft ? 'bg-yellow-500/30 animate-pulse' : 'bg-yellow-500/20'}`}><Zap size={40} className="text-yellow-400" /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Золотые сутки</h3>
                        <p className="text-xs text-slate-400 mb-6 flex-1">Удвоение XP на 24 часа.</p>
                        <div className="w-full mt-auto">{timeLeft ? <Button disabled className="w-full opacity-50 bg-slate-800">Активно</Button> : renderItemAction('Золотые сутки', 5000, 'bonus', 1)}</div>
                    </GlassCard>
                </div>
           )}

           {tab === 'food' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {SORTED_FOOD.map((item, idx) => (
                       <GlassCard key={idx} className="flex flex-col items-center text-center group h-full">
                           <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><item.icon size={32} className="text-orange-400" /></div>
                           <h3 className="font-bold text-white mb-1">{item.name}</h3>
                           <p className="text-xs text-slate-500 mb-4 flex-1">{item.desc}</p>
                           <div className="w-full mt-auto">{renderItemAction(item.name, item.cost, 'food')}</div>
                       </GlassCard>
                   ))}
               </div>
           )}

           {tab === 'dopamine' && (
               <div className="h-full flex flex-col items-center">
                   {!isUnlocked ? (
                       <GlassCard className="w-full max-w-sm p-8 text-center border-rose-500/30 my-10">
                           <Lock size={48} className="text-rose-500 mx-auto mb-4" />
                           <h3 className="text-xl font-bold text-white mb-2">Секретный раздел</h3>
                           <p className="text-slate-400 text-sm mb-6">Введите пин-код.</p>
                           <div className="flex justify-center gap-3 mb-8">
                               {pin.map((digit, i) => (
                                   <input key={i} ref={pinRefs[i]} type="text" maxLength={1} value={digit} onChange={(e) => handlePinChange(e.target.value, i)} className="w-12 h-16 bg-slate-950 border-2 border-white/10 rounded-xl text-center text-2xl font-bold text-rose-400 focus:border-rose-500 outline-none transition-colors" />
                               ))}
                           </div>
                           <Button onClick={checkPin} variant="primary" className="w-full bg-rose-600 hover:bg-rose-500 py-4 text-white">РАЗБЛОКИРОВАТЬ</Button>
                       </GlassCard>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                           {SORTED_DOPAMINE.map((item, idx) => (
                               <GlassCard key={idx} className="flex flex-col items-center text-center border-rose-500/20 group h-full">
                                   <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><item.icon size={32} className="text-rose-400" /></div>
                                   <h3 className="font-bold text-white mb-1">{item.name}</h3>
                                   <p className="text-xs text-slate-500 mb-4 flex-1">{item.desc}</p>
                                   <div className="w-full mt-auto">{renderItemAction(item.name, item.cost, 'dopamine')}</div>
                               </GlassCard>
                           ))}
                       </div>
                   )}
               </div>
           )}

           {tab === 'history' && (
               <div className="space-y-2">
                   {purchaseHistory.length === 0 && <div className="text-center text-slate-500 py-10">История пуста.</div>}
                   {purchaseHistory.map(entry => (
                       <div key={entry.id} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center border border-white/5">
                           <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-full ${entry.category === 'bonus' ? 'bg-purple-500/20 text-purple-400' : entry.category === 'dopamine' ? 'bg-rose-500/20 text-rose-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                   {entry.category === 'dopamine' ? <Lock size={16}/> : <Utensils size={16}/>}
                               </div>
                               <div>
                                   <div className={`font-bold text-sm transition-all ${entry.category === 'dopamine' ? 'blur-[5px] select-none pointer-events-none opacity-50' : ''}`}>
                                       {entry.item_name}
                                   </div>
                                   <div className="text-xs text-slate-500">{entry.date_str}</div>
                               </div>
                           </div>
                           <div className="flex items-center gap-4">
                               <div className="font-mono text-yellow-400 text-sm">-{entry.cost} 🪙</div>
                               <button onClick={() => deleteHistoryEntry(entry.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1"><Trash2 size={16}/></button>
                           </div>
                       </div>
                   ))}
               </div>
           )}
       </div>

       {cart.length > 0 && (
           <div className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between z-50 animate-in slide-in-from-bottom-8 gap-4">
               <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shadow-inner"><ShoppingCart size={24} /></div>
                   <div>
                       <div className="text-sm text-slate-400">Товаров: {cart.reduce((s, i) => s + i.qty, 0)} шт</div>
                       <div className="text-xl font-bold text-white flex items-center gap-2">Итого: <span className={totalCost > profile.coins ? "text-red-400" : "text-white"}>{totalCost}</span> <Coins size={18} className="text-yellow-400" /></div>
                   </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                   <Button variant="ghost" onClick={() => setCart([])} className="flex-1 md:flex-none py-3">Очистить</Button>
                   <Button variant="primary" onClick={handleCheckout} className={`flex-1 md:flex-none py-3 px-6 shadow-lg transition-all ${totalCost > profile.coins ? "bg-red-600 hover:bg-red-500 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"}`}>
                       {totalCost > profile.coins ? 'Не хватает монет' : 'Оформить заказ'}
                   </Button>
               </div>
           </div>
       )}
    </div>
  );
};