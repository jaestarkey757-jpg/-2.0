import React, { Suspense } from 'react';
import { Environment, ContactShadows, Stars, OrbitControls } from '@react-three/drei';
import { Chest } from './Chest';
import { CoinSystem } from './CoinSystem';
import { SpecialItem } from './SpecialItem';
import { AppState, ChestType, Reward, RewardType } from '../types';

interface ExperienceProps {
  appState: AppState;
  chestType: ChestType;
  reward: Reward;
  onOpen: () => void;
}

export const Experience: React.FC<ExperienceProps> = ({ appState, chestType, reward, onOpen }) => {
  return (
    <>
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2.1} 
        minDistance={3}
        maxDistance={12}
        enablePan={false}
        dampingFactor={0.05}
      />

      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} shadow-mapSize={2048} castShadow />
      <spotLight 
        position={[0, 5, 0]} 
        intensity={2} 
        angle={0.6} 
        penumbra={1} 
        castShadow 
        color="#fbbf24" 
      />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />

      <Suspense fallback={null}>
        {appState !== AppState.MENU && (
            <group position={[0, -1, 0]}>
              <Chest appState={appState} type={chestType} onOpen={onOpen} />
              
              {/* Only show coins if reward type is COINS */}
              {reward.type === RewardType.COINS ? (
                 <CoinSystem appState={appState} count={reward.amount} />
              ) : (
                 <SpecialItem appState={appState} type={reward.type} />
              )}
              
              <ContactShadows 
                  opacity={0.6} 
                  scale={10} 
                  blur={2.5} 
                  far={4} 
                  color="#000000" 
              />
            </group>
        )}
      </Suspense>
    </>
  );
};