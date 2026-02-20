import React, { useEffect, useState } from 'react';
import { AppState, ChestType, Reward, RewardType } from '../types';
import { Coins, RotateCcw, Package, Settings, Snowflake, Zap } from 'lucide-react';
import { useGameSounds } from '../hooks/useGameSounds';

interface OverlayProps {
  appState: AppState;
  reward: Reward;
  onReset: () => void;
  onSelectChest: (type: ChestType) => void;
  debugOverride: RewardType | null;
  setDebugOverride: (type: RewardType | null) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  appState, 
  reward, 
  onReset, 
  onSelectChest, 
  debugOverride, 
  setDebugOverride 
}) => {
  const [displayedCoins, setDisplayedCoins] = useState(0);
  const { playHover, playClick } = useGameSounds();

  useEffect(() => {
    if (appState === AppState.OPENED && reward.type === RewardType.COINS) {
      // Counter animation
      let start = 0;
      const end = reward.amount;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quart
        const ease = 1 - Math.pow(1 - progress, 4);
        
        setDisplayedCoins(Math.floor(start + (end - start) * ease));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    } else if (appState === AppState.IDLE) {
      setDisplayedCoins(0);
    }
  }, [appState, reward]);

  // --- DEBUG PANEL ---
  const renderDebugPanel = () => {
      // Only show in MENU or IDLE
      if (appState !== AppState.MENU && appState !== AppState.IDLE) return null;

      return (
          <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-xl">
              <div className="flex items-center gap-2 mb-2 text-white/50 text-[10px] font-bold uppercase tracking-wider">
                  <Settings className="w-3 h-3" />
                  Меню разработчика
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => { playClick(); setDebugOverride(null); }}
                    onMouseEnter={() => playHover()}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${debugOverride === null ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                      Рандом
                  </button>
                  <button 
                    onClick={() => { playClick(); setDebugOverride(RewardType.FREEZE); }}
                    onMouseEnter={() => playHover()}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${debugOverride === RewardType.FREEZE ? 'bg-cyan-500 text-white' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'}`}
                  >
                      <Snowflake className="w-3 h-3" />
                      Фриз
                  </button>
                  <button 
                    onClick={() => { playClick(); setDebugOverride(RewardType.LIGHTNING); }}
                    onMouseEnter={() => playHover()}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${debugOverride === RewardType.LIGHTNING ? 'bg-yellow-500 text-black' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'}`}
                  >
                      <Zap className="w-3 h-3" />
                      День
                  </button>
              </div>
          </div>
      );
  };

  // --- MENU STATE ---
  if (appState === AppState.MENU) {
    return (
      <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        {renderDebugPanel()}
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-widest uppercase drop-shadow-lg text-center">
          ВЫБЕРИТЕ СУНДУК
        </h1>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch">
          
          {/* COMMON */}
          <button 
            onClick={() => onSelectChest(ChestType.COMMON)}
            onMouseEnter={() => playHover()}
            className="group relative flex flex-col items-center p-8 bg-slate-800 border-2 border-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-700 transition-all duration-300 hover:-translate-y-2"
          >
            <div className="w-20 h-20 bg-[#5d4037] rounded-lg mb-4 shadow-lg flex items-center justify-center border-4 border-slate-500">
               <Package className="text-slate-300 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-300 mb-2">ОБЫЧНЫЙ</h2>
            <div className="text-slate-400 text-xs font-medium space-y-1">
              <p>10 - 50 Монет</p>
              <p className="text-cyan-400">1% Заморозка</p>
              <p className="text-yellow-400">0.2% Золотой день</p>
            </div>
          </button>

          {/* RARE */}
          <button 
            onClick={() => onSelectChest(ChestType.RARE)}
            onMouseEnter={() => playHover()}
            className="group relative flex flex-col items-center p-8 bg-blue-950 border-2 border-blue-700 rounded-xl hover:border-blue-400 hover:bg-blue-900 transition-all duration-300 hover:-translate-y-2"
          >
             <div className="absolute -inset-1 bg-blue-500/20 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-20 h-20 bg-[#1e3a8a] rounded-lg mb-4 shadow-lg flex items-center justify-center border-4 border-blue-300 relative z-10">
               <Package className="text-blue-100 w-10 h-10" />
             </div>
            <h2 className="text-2xl font-bold text-blue-300 mb-2 relative z-10">РЕДКИЙ</h2>
            <div className="text-blue-400 text-xs font-medium relative z-10 space-y-1">
              <p>60 - 120 Монет</p>
              <p className="text-cyan-300">2% Заморозка</p>
              <p className="text-yellow-300">0.5% Золотой день</p>
            </div>
          </button>

          {/* EPIC */}
          <button 
            onClick={() => onSelectChest(ChestType.EPIC)}
            onMouseEnter={() => playHover()}
            className="group relative flex flex-col items-center p-8 bg-purple-950 border-2 border-purple-700 rounded-xl hover:border-yellow-400 hover:bg-purple-900 transition-all duration-300 hover:-translate-y-2"
          >
            <div className="absolute -inset-1 bg-purple-500/30 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-20 h-20 bg-[#4c1d95] rounded-lg mb-4 shadow-lg flex items-center justify-center border-4 border-yellow-400 relative z-10">
               <Package className="text-yellow-200 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2 relative z-10">ЭПИЧЕСКИЙ</h2>
            <div className="text-purple-300 text-xs font-medium relative z-10 space-y-1">
              <p>140 - 500 Монет</p>
              <p className="text-cyan-200">4% Заморозка</p>
              <p className="text-yellow-200">1% Золотой день</p>
            </div>
            <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">ЛУЧШИЙ ВЫБОР</span>
          </button>

        </div>
      </div>
    );
  }

  // --- REWARD RENDERER ---
  const renderReward = () => {
    switch (reward.type) {
      case RewardType.FREEZE:
        return (
          <div className="relative flex flex-col items-center">
            {/* Icons removed as requested, 3D model takes focus */}
            <div className="absolute -inset-20 bg-cyan-500/20 blur-3xl rounded-full animate-pulse" />
            
            {/* Added a spacer to push text down so it doesn't overlap the 3D model */}
            <div className="h-32"></div> 

            <div className="text-4xl font-black text-white drop-shadow-lg mt-12 tracking-wider uppercase">
               Заморозка
            </div>
            <div className="text-cyan-300 font-bold mt-2 uppercase text-sm tracking-widest">Редкий предмет!</div>
          </div>
        );
      case RewardType.LIGHTNING:
        return (
          <div className="relative flex flex-col items-center">
             <div className="absolute -inset-20 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
            
             <div className="h-32"></div>

            <div className="text-4xl font-black text-white drop-shadow-lg mt-12 tracking-wider uppercase">
               Золотой день
            </div>
             <div className="text-yellow-400 font-bold mt-2 uppercase text-sm tracking-widest">Легендарная награда!</div>
          </div>
        );
      case RewardType.COINS:
      default:
        return (
          <div className="relative flex flex-col items-center">
              <div className="absolute -inset-20 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="flex items-center space-x-4">
                  <Coins className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
                  <span className="text-8xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                      {displayedCoins}
                  </span>
              </div>
              <div className="text-2xl font-bold text-yellow-400 uppercase tracking-widest mt-2">
                  Золотых монет
              </div>
          </div>
        );
    }
  };

  // --- GAME UI ---
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-12 z-10">
      
      {/* Dev Panel (Visible in Idle too) */}
      {renderDebugPanel()}

      {/* Header */}
      <div className="text-center mt-8">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider uppercase">
          Тайный Сундук
        </h1>
        <p className="text-yellow-200/60 mt-2 font-medium tracking-widest text-sm">
          {appState === AppState.IDLE ? "НАЖМИТЕ НА СУНДУК" : appState === AppState.OPENED ? "НАГРАДА ПОЛУЧЕНА" : "ОТКРЫВАЕМ..."}
        </p>
      </div>

      {/* Center Reward Display */}
      <div className={`transition-all duration-700 transform ${appState === AppState.OPENED ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}`}>
        {renderReward()}
      </div>

      {/* Footer / Reset Button */}
      <div className={`transition-opacity duration-500 ${appState === AppState.OPENED ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
        <button 
          onClick={() => { playClick(); onReset(); }}
          onMouseEnter={() => playHover()}
          className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700 text-white px-8 py-4 rounded-full backdrop-blur-md border border-slate-600 shadow-xl transition-all hover:scale-105 active:scale-95 group"
        >
          <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
          <span className="font-bold tracking-wide">ВЫБРАТЬ СНОВА</span>
        </button>
      </div>

       {/* Mobile helper for IDLE state */}
       {appState === AppState.IDLE && (
         <div className="md:hidden absolute bottom-20 animate-bounce text-white/50 text-sm font-medium pointer-events-none">
            Нажмите на сундук
         </div>
       )}

    </div>
  );
};