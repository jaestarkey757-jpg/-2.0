import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useSpring, animated, config } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import { AppState, ChestType } from '../types';
import * as THREE from 'three';

interface ChestProps {
  appState: AppState;
  type: ChestType;
  onOpen: () => void;
}

// Глобальный кэш
let cachedImperfectionTexture: THREE.CanvasTexture | null = null;

// Гипер-быстрый генератор текстуры
const generateImperfectionTexture = () => {
    if (cachedImperfectionTexture) return cachedImperfectionTexture;

    const canvas = document.createElement('canvas');
    // Уменьшаем разрешение до 128x128 (этого более чем достаточно для бамп-мапы)
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);

    // Манипуляция пикселями работает в ~100 раз быстрее, чем вызовы fillRect
    const imgData = ctx.getImageData(0, 0, 128, 128);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.8) {
            const shade = Math.floor(Math.random() * 255);
            data[i] = data[i+1] = data[i+2] = shade;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Царапины
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for(let i=0; i< 30; i++) {
        ctx.beginPath();
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Растягиваем маленькую текстуру
    
    cachedImperfectionTexture = texture;
    return texture;
};

export const Chest: React.FC<ChestProps> = ({ appState, type, onOpen }) => {
  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group>(null);
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const tex = generateImperfectionTexture();
    setRoughnessMap(tex);
  }, []);

  const { lidRotation } = useSpring({
    lidRotation: appState !== AppState.IDLE && appState !== AppState.MENU ? -Math.PI / 1.5 : 0,
    config: { mass: 1, tension: 170, friction: 14 },
  });

  const { scale } = useSpring({
    scale: hovered && appState === AppState.IDLE ? 1.05 : 1,
    config: config.wobbly,
  });

  const materials = useMemo(() => {
    let bodyColor = '#5d4037';
    let trimColor = '#9e9e9e'; 
    let trimMetalness = 0.6;
    let trimRoughness = 0.4;
    
    switch (type) {
      case ChestType.COMMON:
        bodyColor = '#3E2723'; 
        trimColor = '#455A64'; 
        trimMetalness = 0.4;
        break;
      case ChestType.RARE:
        bodyColor = '#1565C0'; 
        trimColor = '#EEEEEE'; 
        trimMetalness = 0.9;
        trimRoughness = 0.3;
        break;
      case ChestType.EPIC:
        bodyColor = '#4A148C'; 
        trimColor = '#FFD700'; 
        trimMetalness = 1.0;
        trimRoughness = 0.25;
        break;
    }

    const commonProps = {
        roughnessMap: roughnessMap,
        bumpMap: roughnessMap,
        bumpScale: 0.005,
    };

    return {
      body: new THREE.MeshStandardMaterial({ 
        color: bodyColor, 
        roughness: 0.8, 
        metalness: 0.05,
        ...commonProps
      }),
      trim: new THREE.MeshStandardMaterial({ 
        color: trimColor, 
        roughness: trimRoughness, 
        metalness: trimMetalness,
        envMapIntensity: 1.2,
        ...commonProps
      }),
      lock: new THREE.MeshStandardMaterial({
        color: type === ChestType.EPIC ? '#ff0000' : '#263238',
        roughness: 0.4,
        metalness: 0.8,
        emissive: type === ChestType.EPIC ? '#500000' : '#000000',
        ...commonProps
      }),
      inside: new THREE.MeshStandardMaterial({
        color: '#0f0500', 
        roughness: 1,
        side: THREE.DoubleSide
      })
    };
  }, [type, roughnessMap]);

  const BoxPart = ({ args, radius = 0.02, smoothness = 4, material, ...props }: any) => (
    <RoundedBox args={args} radius={radius} smoothness={smoothness} {...props} material={material} />
  );

  return (
    <animated.group 
      ref={group} 
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (appState === AppState.IDLE) {
          onOpen();
        }
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <group position={[0, 0.5, 0]}>
        <BoxPart position={[0, -0.45, 0]} args={[1.8, 0.1, 1.2]} material={materials.body} castShadow receiveShadow />
        <BoxPart position={[0, 0, 0.55]} args={[1.8, 0.8, 0.1]} material={materials.body} castShadow receiveShadow />
        <BoxPart position={[0, 0, -0.55]} args={[1.8, 0.8, 0.1]} material={materials.body} castShadow receiveShadow />
        <BoxPart position={[-0.85, 0, 0]} args={[0.1, 0.8, 1.0]} material={materials.body} castShadow receiveShadow />
        <BoxPart position={[0.85, 0, 0]} args={[0.1, 0.8, 1.0]} material={materials.body} castShadow receiveShadow />
        <mesh position={[0, -0.4, 0]} material={materials.inside}>
            <boxGeometry args={[1.6, 0.05, 1.0]} />
        </mesh>
        <BoxPart position={[-0.86, 0, 0.56]} args={[0.14, 0.82, 0.14]} radius={0.01} material={materials.trim} castShadow />
        <BoxPart position={[0.86, 0, 0.56]} args={[0.14, 0.82, 0.14]} radius={0.01} material={materials.trim} castShadow />
        <BoxPart position={[-0.86, 0, -0.56]} args={[0.14, 0.82, 0.14]} radius={0.01} material={materials.trim} castShadow />
        <BoxPart position={[0.86, 0, -0.56]} args={[0.14, 0.82, 0.14]} radius={0.01} material={materials.trim} castShadow />
      </group>

      <animated.group position={[0, 0.9, -0.5]} rotation-x={lidRotation}>
        <group position={[0, 0, 0.5]}> 
          <BoxPart position={[0, 0.15, 0]} args={[1.8, 0.3, 1.2]} radius={0.04} material={materials.body} castShadow receiveShadow />
          <BoxPart position={[0, 0.35, 0]} args={[1.6, 0.1, 1.0]} radius={0.03} material={materials.body} castShadow receiveShadow />
          <BoxPart position={[0, 0.15, 0]} args={[0.22, 0.32, 1.22]} radius={0.01} material={materials.trim} castShadow />
          <BoxPart position={[0, 0.15, 0.6]} args={[1.82, 0.22, 0.12]} radius={0.01} material={materials.trim} castShadow />
        </group>
      </animated.group>

      <BoxPart position={[0, 0.6, 0.6]} args={[0.3, 0.3, 0.15]} radius={0.02} material={materials.lock} castShadow />
    </animated.group>
  );
};