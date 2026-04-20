import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig';
import type { GridPos, PickupKind } from '../core/Types';
import type { RendererSystem } from '../systems/RendererSystem';

const PICKUP_COLORS: Record<PickupKind, number> = {
  bomb: 0xf97316,
  range: 0xfacc15,
  speed: 0x22c55e,
};

export class Pickup {
  readonly group = new THREE.Group();
  private readonly baseY = 0.38;

  constructor(
    readonly id: string,
    readonly kind: PickupKind,
    readonly gridPos: GridPos,
    renderer: RendererSystem,
  ) {
    const material = new THREE.MeshStandardMaterial({
      color: PICKUP_COLORS[kind],
      emissive: PICKUP_COLORS[kind],
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), material);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.group.position.copy(renderer.gridToWorld(gridPos));
    this.group.position.y = this.baseY;
  }

  update(delta: number): void {
    this.group.rotation.y += delta * 2.4;
    this.group.position.y = this.baseY + Math.sin(performance.now() * 0.001 * GAME_CONFIG.pickups.bobSpeed) * 0.09;
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
  }
}
