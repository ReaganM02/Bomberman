import * as THREE from 'three';
import { TILE_SIZE } from '../config/GameConfig';
import type { Grid } from '../core/Grid';
import type { GridPos } from '../core/Types';
import type { RendererSystem } from '../systems/RendererSystem';

export class BoardMeshes {
  readonly crateMeshes = new Map<string, THREE.Mesh>();
  readonly floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.82 });
  readonly floorAltMaterial = new THREE.MeshStandardMaterial({ color: 0x263244, roughness: 0.82 });
  readonly hardMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.66 });
  readonly crateMaterial = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.76 });

  private readonly floorGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.12, TILE_SIZE * 0.94);
  private readonly hardGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.9, 1.08, TILE_SIZE * 0.9);
  private readonly crateGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.82, 0.86, TILE_SIZE * 0.82);

  constructor(
    private readonly renderer: RendererSystem,
    private readonly grid: Grid,
  ) {}

  build(): void {
    this.grid.forEach((pos, kind) => {
      const floor = new THREE.Mesh(this.floorGeometry, (pos.x + pos.y) % 2 === 0 ? this.floorMaterial : this.floorAltMaterial);
      floor.receiveShadow = true;
      floor.position.copy(this.renderer.gridToWorld(pos));
      floor.position.y = -0.08;
      this.renderer.world.add(floor);

      if (kind === 'hard') {
        const block = new THREE.Mesh(this.hardGeometry, this.hardMaterial);
        block.castShadow = true;
        block.receiveShadow = true;
        block.position.copy(this.renderer.gridToWorld(pos));
        block.position.y = 0.48;
        this.renderer.world.add(block);
      }
      if (kind === 'crate') this.addCrate(pos);
    });
  }

  addCrate(pos: GridPos): void {
    const mesh = new THREE.Mesh(this.crateGeometry, this.crateMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(this.renderer.gridToWorld(pos));
    mesh.position.y = 0.36;
    this.crateMeshes.set(`${pos.x},${pos.y}`, mesh);
    this.renderer.world.add(mesh);
  }

  destroyCrate(pos: GridPos): void {
    const key = `${pos.x},${pos.y}`;
    const mesh = this.crateMeshes.get(key);
    if (!mesh) return;
    this.crateMeshes.delete(key);
    mesh.parent?.remove(mesh);
  }
}
