import React, { useState, useEffect } from 'react';
import { RANKS } from '../types';
import { GlassCard, Button } from './ui/GlassCard';
import { Crown, Sparkles, X, Gift } from 'lucide-react';
import { SoundManager } from './SoundManager';
import confetti from 'canvas-confetti';

// --- RANK UP MODAL ---

interface RankUpProps {
    newRankIndex: number;
    onClose: () => void;
}

export const RankUpModal: React.FC<RankUpProps> = ({ newRankIndex, onClose }) => {
    const rank = RANKS[newRankIndex];

    useEffect(() => {
        SoundManager.playAchievement("Новый ранг достигнут!");
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-in zoom-in-90 duration-300">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr ${rank.color} opacity-20 blur-[100px] animate-pulse`}></div>
            </div>

            <GlassCard className="max-w-md w-full flex flex-col items-center text-center border-2 border-white/20 shadow-2xl relative bg-[#1a202c]">
                 <div className="absolute -top-12">
                     <div className={`w-24 h-24 rounded-full bg-slate-900 border-4 border-[#1a202c] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
                        <Crown className="text-yellow-400 drop-shadow-lg" size={48} />
                     </div>
                 </div>

                 <div className="mt-12 space-y-4">
                     <h2 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm">
                         Уровень повышен!
                     </h2>
                     <div className="py-4">
                         <div className="text-slate-400 text-sm uppercase tracking-widest mb-2">Новая арена</div>
                         <div className={`text-4xl font-bold bg-gradient-to-r ${rank.color} bg-clip-text text-transparent`}>
                             {rank.title}
                         </div>
                     </div>
                     <p className="text-slate-300 px-4">
                         Поздравляем! Вы достигли новых высот в саморазвитии. Продолжайте в том же духе.
                     </p>
                 </div>

                 <Button onClick={onClose} variant="primary" className="mt-8 w-full py-3 text-lg font-bold bg-white/10 hover:bg-white/20 border-white/20">
                     ЗАБРАТЬ НАГРАДУ
                 </Button>
            </GlassCard>
        </div>
    );
};