import React, { useState, useRef, useCallback } from 'react';
import { GlassCard, Button } from './ui/GlassCard';
import { ZoomIn, ZoomOut, Check, X, Move, RefreshCw } from 'lucide-react';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onCrop: (base64: string) => void;
}

const CROP_SIZE = 200; // Реальный размер круга-маски

export const ImageCropper: React.FC<Props> = ({ imageSrc, onCancel, onCrop }) => {
  const [scale, setScale] = useState(1);
  const [minAllowedScale, setMinAllowedScale] = useState(0.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgLayout, setImgLayout] = useState({ naturalWidth: 0, naturalHeight: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });

  // Теперь ограничения жестко привязаны к 200x200. Это позволит дотянуть любой край картинки до границы круга.
  const clampPosition = useCallback((x: number, y: number, currentScale: number, width: number, height: number) => {
    if (!width || !height) return { x, y };

    const renderWidth = width * currentScale;
    const renderHeight = height * currentScale;

    // Считаем доступный ход картинки относительно внутреннего круга (CROP_SIZE)
    const boundX = Math.max(0, (renderWidth - CROP_SIZE) / 2);
    const boundY = Math.max(0, (renderHeight - CROP_SIZE) / 2);

    return {
        x: Math.min(Math.max(x, -boundX), boundX),
        y: Math.min(Math.max(y, -boundY), boundY)
    };
  }, []);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgLayout({ naturalWidth, naturalHeight });

    // Минимальный масштаб тоже считаем по видимому кругу, чтобы не блокировать оси лишний раз
    const minS = Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
    setMinAllowedScale(minS);
    setScale(minS);
    setPosition({ x: 0, y: 0 });
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
        startX: clientX,
        startY: clientY,
        initialPosX: position.x,
        initialPosY: position.y
    };
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const dx = clientX - dragStart.current.startX;
    const dy = clientY - dragStart.current.startY;
    
    const newX = dragStart.current.initialPosX + dx;
    const newY = dragStart.current.initialPosY + dy;

    setPosition(clampPosition(newX, newY, scale, imgLayout.naturalWidth, imgLayout.naturalHeight));
  }, [isDragging, scale, imgLayout, clampPosition]);

  const handleEnd = () => setIsDragging(false);

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newScale = parseFloat(e.target.value);
      setScale(newScale);
      // Сразу корректируем позицию, если при зуме нарушились границы
      setPosition(prev => clampPosition(prev.x, prev.y, newScale, imgLayout.naturalWidth, imgLayout.naturalHeight));
  };

  const handleReset = () => {
    setScale(minAllowedScale);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
        
        const renderWidth = imgLayout.naturalWidth * scale;
        const renderHeight = imgLayout.naturalHeight * scale;
        
        // Математика для Canvas (перенос центра UI в координаты Canvas 200x200)
        const drawX = (CROP_SIZE / 2) + position.x - (renderWidth / 2);
        const drawY = (CROP_SIZE / 2) + position.y - (renderHeight / 2);
        
        ctx.drawImage(imgRef.current, drawX, drawY, renderWidth, renderHeight);
        onCrop(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  const renderWidth = imgLayout.naturalWidth * scale;
  const renderHeight = imgLayout.naturalHeight * scale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-md flex flex-col items-center border-white/20 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-6">Редактор аватара</h3>
        
        {/* Контейнер кроппера */}
        <div 
          className="relative w-64 h-64 bg-slate-950 rounded-2xl overflow-hidden mb-8 cursor-move touch-none border border-white/10"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={handleEnd}
        >
           {/* Маска (круг) */}
           <div className="absolute inset-0 pointer-events-none z-20 border-[28px] border-slate-950/80 rounded-full ring-1 ring-white/20"></div>
           <div className="absolute inset-0 pointer-events-none z-20 border border-white/5 rounded-2xl"></div>
           
           {/* Отрисовка изображения */}
           <div className="w-full h-full flex items-center justify-center pointer-events-none relative">
             <img 
               ref={imgRef}
               src={imageSrc} 
               alt="Crop target"
               onLoad={onImageLoad}
               draggable={false}
               style={{ 
                 width: imgLayout.naturalWidth ? `${renderWidth}px` : 'auto',
                 height: imgLayout.naturalHeight ? `${renderHeight}px` : 'auto',
                 transform: `translate(${position.x}px, ${position.y}px)`,
                 transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)',
                 maxWidth: 'none',
                 position: 'absolute'
               }}
               className="select-none object-cover" 
             />
           </div>

           <div className="absolute bottom-3 right-3 z-30 text-white/30 pointer-events-none flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-black/20 px-2 py-1 rounded">
             <Move size={12} /> Drag
           </div>
        </div>

        {/* Слайдер масштаба */}
        <div className="w-full px-4 mb-8">
           <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <ZoomOut size={18} className="text-slate-500" />
              <input 
                type="range" 
                min={minAllowedScale} 
                max={Math.max(minAllowedScale * 5, 5)} 
                step="0.01" 
                value={scale} 
                onChange={handleScaleChange}
                className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn size={18} className="text-slate-500" />
              <button onClick={handleReset} className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors" title="Сбросить">
                <RefreshCw size={16} />
              </button>
           </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-4 w-full">
            <Button onClick={onCancel} variant="ghost" className="flex-1 py-3 text-slate-400">
                <X size={18} /> Отмена
            </Button>
            <Button onClick={handleSave} variant="primary" className="flex-1 py-3 shadow-lg shadow-cyan-500/20">
                <Check size={18} /> Готово
            </Button>
        </div>
      </GlassCard>
    </div>
  );
};