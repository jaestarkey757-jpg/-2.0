import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useSpring, animated, config } from '@react-spring/three';
import * as THREE from 'three';
import { AppState, RewardType } from '../types';

interface SpecialItemProps {
  appState: AppState;
  type: RewardType;
}

export const SpecialItem: React.FC<SpecialItemProps> = ({ appState, type }) => {
  const group = useRef<THREE.Group>(null);
  
  // --- GEOMETRIES ---

  // Snowflake: 3 intersected boxes
  const snowflakeGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    return geo;
  }, []);

  // Lightning: Extruded Shape
  const lightningGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Zig-zag shape
    shape.moveTo(0, 0);
    shape.lineTo(-0.3, 0.5);
    shape.lineTo(-0.1, 0.5);
    shape.lineTo(-0.4, 1.2);
    shape.lineTo(0.3, 0.6);
    shape.lineTo(0.1, 0.6);
    shape.lineTo(0.3, 0);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center(); // Center the geometry
    return geo;
  }, []);


  // --- MATERIALS ---
  const materials = useMemo(() => {
    return {
      snowflake: new THREE.MeshStandardMaterial({
        color: '#a5f3fc', // Cyan-200
        emissive: '#06b6d4', // Cyan-500
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
      }),
      lightning: new THREE.MeshStandardMaterial({
        color: '#fef08a', // Yellow-200
        emissive: '#eab308', // Yellow-500
        emissiveIntensity: 1.5,
        metalness: 0.8,
        roughness: 0.1,
      })
    };
  }, []);

  const isOpen = appState === AppState.OPENING || appState === AppState.OPENED;

  // Spring animation: 
  // 1. Scale: 0 -> 1.5
  // 2. Position Y: 0.5 (Inside chest) -> 1.8 (Hovering above, lowered from 2.5)
  // Tension reduced for smoother, less "snappy" motion.
  const { scale, positionY } = useSpring({
    scale: isOpen ? 1.5 : 0,
    positionY: isOpen ? 1.8 : 0.5,
    config: { mass: 2, tension: 50, friction: 15 } // Slower, heavier feel
  });

  useFrame((state) => {
    if (!group.current) return;
    
    // Rotate constantly for presentation
    group.current.rotation.y += 0.02;
    // Slight tilt wobble
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });

  // If menu or idle, don't show (it's inside hidden)
  if (appState === AppState.MENU || appState === AppState.IDLE) return null;

  const isLightning = type === RewardType.LIGHTNING;

  return (
    // Animated Group handles the "Fly Out" motion via positionY
    <animated.group position-y={positionY}> 
      {/* Float creates the gentle hovering effect once it's up */}
      <Float 
        speed={4} 
        rotationIntensity={0.5} 
        floatIntensity={0.5} 
        floatingRange={[-0.1, 0.1]} 
      >
        <animated.group ref={group} scale={scale}> 
           
           {isLightning ? (
              <mesh geometry={lightningGeometry} material={materials.lightning} castShadow />
           ) : (
             <group>
                {/* 3 Crossed bars for a snowflake */}
                <mesh geometry={snowflakeGeometry} material={materials.snowflake} castShadow />
                <mesh geometry={snowflakeGeometry} material={materials.snowflake} rotation={[0, 0, Math.PI/3]} castShadow />
                <mesh geometry={snowflakeGeometry} material={materials.snowflake} rotation={[0, 0, -Math.PI/3]} castShadow />
             </group>
           )}

           {/* Particle Glow Effect (Simple Sphere behind) */}
           <pointLight 
              distance={4} 
              intensity={4} 
              color={isLightning ? "#eab308" : "#06b6d4"} 
           />
        </animated.group>
      </Float>
    </animated.group>
  );
};