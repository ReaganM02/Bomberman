import * as THREE from 'three';
import type { GridPos } from '../core/Types';
import type { RendererSystem } from '../systems/RendererSystem';

export class Bomb {
  readonly group = new THREE.Group();
  timer: number;
  exploding = false;

  private readonly mesh: THREE.Mesh;
  private readonly ring: THREE.Mesh;

  constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly gridPos: GridPos,
    fuseSeconds: number,
    private readonly renderer: RendererSystem,
  ) {
    this.timer = fuseSeconds;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.15 }),
    );
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.9 }),
    );
    this.mesh.castShadow = true;
    this.ring.rotation.x = Math.PI / 2;
    this.group.add(this.mesh, this.ring);
    this.group.position.copy(renderer.gridToWorld(gridPos));
    this.group.position.y = 0.34;
  }

  update(delta: number): void {
    this.timer -= delta;
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.06;
    const urgency = Math.max(0, 1.4 - this.timer) * 0.08;
    this.group.scale.setScalar(pulse + urgency);
    this.ring.rotation.z += delta * 5;
  }

  detonateSoon(delay: number): void {
    this.timer = Math.min(this.timer, delay);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
  }
}
