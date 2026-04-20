import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetSystem {
  private readonly loader = new GLTFLoader();
  private character?: GLTF;

  async load(): Promise<void> {
    try {
      this.character = await this.loader.loadAsync('/assets/models/blastgrid-runner.glb');
    } catch (error) {
      console.warn('GLB character failed to load; using runtime fallback mesh.', error);
    }
  }

  createCharacterModel(accentColor: number, bodyColor = 0xf8fafc): { model: THREE.Group; animations: THREE.AnimationClip[] } {
    if (this.character) {
      const model = this.character.scene.clone(true);
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const source = child.material;
          const material = Array.isArray(source) ? source[0].clone() : source.clone();
          if (material instanceof THREE.MeshStandardMaterial) {
            if (
              child.name === 'Body' ||
              child.name === 'Head' ||
              child.name.endsWith('Forearm') ||
              child.name.endsWith('Hand') ||
              child.name.endsWith('Foot')
            ) {
              material.color.setHex(bodyColor);
            }
            if (child.name === 'TeamPanel') {
              material.color.setHex(accentColor);
              material.emissive.setHex(accentColor);
              material.emissiveIntensity = 0.12;
            }
          }
          child.material = material;
        }
      });
      return { model, animations: this.character.animations };
    }

    return this.createFallbackCharacter(accentColor, bodyColor);
  }

  private createFallbackCharacter(accentColor: number, bodyColor: number): { model: THREE.Group; animations: THREE.AnimationClip[] } {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 16),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.86 }),
    );
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 22, 14),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.84 }),
    );
    const panel = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 8),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.12, roughness: 0.62 }),
    );
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.62 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeMaterial);
    const rightEye = leftEye.clone();
    const faceLine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), eyeMaterial);
    const leftArm = this.createFallbackArm('Left', -0.47, bodyColor);
    const rightArm = this.createFallbackArm('Right', 0.47, bodyColor);
    body.position.y = 0.72;
    body.scale.set(1.02, 1.34, 0.86);
    head.position.y = 1.36;
    head.scale.set(1.06, 0.78, 0.9);
    panel.name = 'TeamPanel';
    panel.position.set(0, 0.82, -0.39);
    panel.scale.set(1, 0.34, 0.16);
    leftEye.position.set(-0.105, 1.38, -0.294);
    rightEye.position.set(0.105, 1.38, -0.294);
    faceLine.position.set(0, 1.38, -0.298);
    body.castShadow = true;
    head.castShadow = true;
    panel.castShadow = true;
    group.add(body, head, panel, leftEye, rightEye, faceLine, leftArm, rightArm);
    const idle = new THREE.AnimationClip('idle', 1, [
      new THREE.VectorKeyframeTrack('.position', [0, 0.5, 1], [0, 0, 0, 0, 0.05, 0, 0, 0, 0]),
      new THREE.NumberKeyframeTrack('LeftArm.rotation[z]', [0, 0.5, 1], [0.26, 0.22, 0.26]),
      new THREE.NumberKeyframeTrack('RightArm.rotation[z]', [0, 0.5, 1], [-0.26, -0.22, -0.26]),
    ]);
    const run = new THREE.AnimationClip('run', 0.28, [
      new THREE.VectorKeyframeTrack('.scale', [0, 0.14, 0.28], [1, 1, 1, 1.08, 0.93, 1.08, 1, 1, 1]),
      new THREE.NumberKeyframeTrack('LeftArm.rotation[z]', [0, 0.14, 0.28], [0.08, 0.5, 0.08]),
      new THREE.NumberKeyframeTrack('RightArm.rotation[z]', [0, 0.14, 0.28], [-0.5, -0.08, -0.5]),
    ]);
    const death = new THREE.AnimationClip('death', 0.8, [
      new THREE.VectorKeyframeTrack('.scale', [0, 0.3, 0.8], [1, 1, 1, 1.15, 0.65, 1.15, 0.05, 0.05, 0.05]),
    ]);
    const victory = new THREE.AnimationClip('victory', 0.7, [
      new THREE.VectorKeyframeTrack('.position', [0, 0.2, 0.45, 0.7], [0, 0, 0, 0, 0.32, 0, 0, 0, 0, 0, 0.14, 0]),
      new THREE.NumberKeyframeTrack('LeftArm.rotation[z]', [0, 0.2, 0.45, 0.7], [0.26, 0.82, 0.26, 0.62]),
      new THREE.NumberKeyframeTrack('RightArm.rotation[z]', [0, 0.2, 0.45, 0.7], [-0.26, -0.82, -0.26, -0.62]),
    ]);
    return { model: group, animations: [idle, run, death, victory] };
  }

  private createFallbackArm(side: 'Left' | 'Right', x: number, bodyColor: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.name = `${side}Arm`;
    pivot.position.set(x, 0.98, -0.01);
    pivot.rotation.z = side === 'Left' ? 0.26 : -0.26;
    const material = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.86 });
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.44, 8, 16), material);
    forearm.name = `${side}Forearm`;
    forearm.position.y = -0.29;
    forearm.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), material);
    hand.name = `${side}Hand`;
    hand.position.set(0, -0.57, -0.01);
    hand.scale.set(1.05, 0.92, 1);
    hand.castShadow = true;
    pivot.add(forearm, hand);
    return pivot;
  }
}
