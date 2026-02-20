import { useMemo, useEffect } from 'react';
import { Howl } from 'howler';

export const useGameSounds = () => {
  const sounds = useMemo(() => {
    return {
      // Тихий, приятный "тик" при наведении (Nintendo style)
      hover: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'],
        volume: 0.2,
      }),
      // Уверенный, но мягкий клик
      click: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'],
        volume: 0.4,
      }),
      // Звук выбора сундука (более тяжелый клик)
      select: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'],
        volume: 0.5,
      }),
      // Магический звук открытия и "Вжух"
      open: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], 
        volume: 0.6,
        rate: 1.1 // Чуть быстрее для динамики
      }),
      // Звон монет (для обычного дропа)
      coins: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'],
        volume: 0.5,
      }),
      // Звук льда/кристалла для Фриза (Magic Glint / Ice)
      freeze: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/1437/1437-preview.mp3'], 
        volume: 0.7,
      }),
      // Эпичный звук для Золотого дня (оставляем прежний legendary)
      lightning: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2060/2060-preview.mp3'], // Success chime
        volume: 0.5,
      }),
      // Сброс
      reset: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2160/2160-preview.mp3'], // Whoosh transition
        volume: 0.3,
      })
    };
  }, []);

  // Preload
  useEffect(() => {
    Object.values(sounds).forEach(s => s.load());
  }, [sounds]);

  return {
    playHover: () => sounds.hover.play(),
    playClick: () => sounds.click.play(),
    playSelect: () => sounds.select.play(),
    playOpen: () => sounds.open.play(),
    playCoins: () => sounds.coins.play(),
    playFreeze: () => sounds.freeze.play(),
    playLightning: () => sounds.lightning.play(),
    playReset: () => sounds.reset.play(),
  };
};