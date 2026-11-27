import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import playerAsset from '../assets/player.glb';

export async function loadPlayer() {
  const { scene } = await new GLTFLoader().parseAsync(playerAsset.buffer, '');
  return scene;
}

export function makePlayer(template) {
  const rig = clone(template);
  const skin = rig.getObjectByName('PlayerSkin');
  // Each replay owns the resources released by disposeScene.
  skin.geometry = skin.geometry.clone();
  skin.material = skin.material.clone();
  skin.material.map = skin.material.map.clone();
  skin.castShadow = true;
  skin.receiveShadow = true;
  skin.frustumCulled = false;

  const player = new Group();
  player.add(rig);
  player.scale.setScalar(1.38);
  // Expose the same animation targets as the procedural characters.
  const joints = (names) => names.map((name) => rig.getObjectByName(name));
  player.userData = {
    body: rig.getObjectByName('Torso'),
    legs: joints(['LegNegativeX', 'LegPositiveX']),
    arms: joints(['ArmNegativeX', 'ArmPositiveX']),
    phase: Math.random() * 6,
  };
  return player;
}
