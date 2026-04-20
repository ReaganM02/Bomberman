import * as THREE from 'three';
import type { Direction, GridPos } from '../core/Types';

export function keyOf(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

export function samePos(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function addDir(pos: GridPos, dir: Direction): GridPos {
  return { x: pos.x + dir.x, y: pos.y + dir.y };
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function lerpVector(target: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3, alpha: number): void {
  target.set(
    THREE.MathUtils.lerp(from.x, to.x, alpha),
    THREE.MathUtils.lerp(from.y, to.y, alpha),
    THREE.MathUtils.lerp(from.z, to.z, alpha),
  );
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
