import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState, CoinData } from '../types';

interface CoinSystemProps {
  appState: AppState;
  count: number;
}

export const CoinSystem: React.FC<CoinSystemProps> = ({ appState, count }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Coin geometry - Cylinder
  // По умолчанию в Three.js цилиндр ориентирован вертикально (ось Y).
  // Это означает, что если Rotation = [0,0,0], монета лежит ПЛАШМЯ круглой стороной вверх.
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.12, 0.12, 0.03, 32), []);
  
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffd700',
    metalness: 0.8,
    roughness: 0.35,
    emissive: '#b8860b',
    emissiveIntensity: 0.05,
  }), []);

  // Store static state for each coin
  const coins = useRef<CoinData[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize coins when chest opens
  useEffect(() => {
    if (appState === AppState.OPENING) {
      const newCoins: CoinData[] = [];
      
      const baseHeight = 0.05; // Чуть ниже, прямо у дна
      const spreadFactor = Math.min(1, Math.max(0.25, Math.pow(count / 200, 0.6)));
      const maxSpreadX = 1.4 * spreadFactor;
      const maxSpreadZ = 0.8 * spreadFactor;
      const maxPileHeight = 0.25 + (count * 0.0012); 

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        
        const x = r * Math.cos(angle) * (maxSpreadX / 2);
        const z = r * Math.sin(angle) * (maxSpreadZ / 2);

        const distNorm = r; 
        const heightAtPos = maxPileHeight * Math.max(0, 1 - Math.pow(distNorm, 1.5));
        
        const yRel = heightAtPos * Math.random();
        const y = baseHeight + yRel;

        newCoins.push({
          position: [x, y, z],
          rotation: [
            // ИСПРАВЛЕНИЕ: Убрали поворот на 90 градусов.
            // Теперь базовое положение [0,0,0] - это лежачая монета.
            // Добавляем случайный наклон (tilt) до ~30 градусов (0.5 рад),
            // чтобы куча выглядела естественно неряшливой.
            (Math.random() - 0.5) * 0.8, 
            
            // Вращение вокруг вертикальной оси (как повернут "орел") - любое
            Math.random() * Math.PI * 2, 
            
            // Наклон по другой оси
            (Math.random() - 0.5) * 0.8
          ],
          scale: 0 
        });
      }
      coins.current = newCoins;
    } else if (appState === AppState.MENU) {
      coins.current = [];
    }
  }, [appState, count]);

  // Animation Loop
  useFrame((state, delta) => {
    if (!meshRef.current || coins.current.length === 0) {
        if (meshRef.current) meshRef.current.count = 0;
        return;
    }

    meshRef.current.count = coins.current.length;
    const growSpeed = delta * 4; 

    coins.current.forEach((coin, i) => {
      if (coin.scale < 1) {
        const delay = (i % 50) * 0.01 + (Math.floor(i/50) * 0.1); 
        if (state.clock.elapsedTime > delay) {
             coin.scale = Math.min(1, coin.scale + growSpeed);
        }
      }

      dummy.position.set(coin.position[0], coin.position[1], coin.position[2]);
      dummy.rotation.set(coin.rotation[0], coin.rotation[1], coin.rotation[2]);
      dummy.scale.setScalar(coin.scale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 1000]}
      castShadow
      receiveShadow
    />
  );
};