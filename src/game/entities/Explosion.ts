import * as THREE from 'three';
import { GAME_CONFIG, TILE_SIZE } from '../config/GameConfig';
import type { GridPos } from '../core/Types';
import type { RendererSystem } from '../systems/RendererSystem';

type ExplosionStyle = typeof GAME_CONFIG.visuals.explosionStyle;
type ExplosionQuality = typeof GAME_CONFIG.visuals.explosionQuality;

interface Spark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  velocity: THREE.Vector3;
}

interface ScorchMark {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

const STYLE_PALETTES: Record<
  ExplosionStyle,
  {
    core: number;
    edge: number;
    smoke: number;
    spark: number;
    shockwave: number;
    light: number;
  }
> = {
  classic: {
    core: 0xfff7ad,
    edge: 0xff6b00,
    smoke: 0x475569,
    spark: 0xfff3a3,
    shockwave: 0xffb020,
    light: 0xffa31a,
  },
  arcade: {
    core: 0xffff7a,
    edge: 0xff2d55,
    smoke: 0x334155,
    spark: 0xfff35c,
    shockwave: 0xff2d55,
    light: 0xffd166,
  },
  realistic: {
    core: 0xfff0b3,
    edge: 0xff6a00,
    smoke: 0x1f2937,
    spark: 0xffc857,
    shockwave: 0xff8a00,
    light: 0xff7a18,
  },
  cyber: {
    core: 0xbff9ff,
    edge: 0x38bdf8,
    smoke: 0x334155,
    spark: 0x67e8f9,
    shockwave: 0x22d3ee,
    light: 0x67e8f9,
  },
};

export class Explosion {
  readonly group = new THREE.Group();
  timer: number;

  private readonly duration: number;
  private readonly style: ExplosionStyle;
  private readonly quality: ExplosionQuality;
  private readonly palette;
  private readonly heatTiles = new THREE.Group();
  private readonly flameColumns = new THREE.Group();
  private readonly shockwave = new THREE.Group();
  private readonly sparks: Spark[] = [];
  private readonly smoke: SmokePuff[] = [];
  private readonly scorchMarks: ScorchMark[] = [];
  private readonly flashLight?: THREE.PointLight;

  private readonly heatGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.08, TILE_SIZE * 0.92);
  private readonly flameGeometry = new THREE.ConeGeometry(TILE_SIZE * 0.34, 1.3, 7, 1, true);
  private readonly sparkGeometry = new THREE.BoxGeometry(0.055, 0.055, 0.18);
  private readonly smokeGeometry = new THREE.SphereGeometry(0.22, 10, 8);
  private readonly scorchGeometry = new THREE.CircleGeometry(TILE_SIZE * 0.38, 24);
  private readonly shockwaveGeometry = new THREE.TorusGeometry(0.55, 0.026, 8, 64);

  private readonly heatMaterial: THREE.MeshStandardMaterial;
  private readonly flameMaterial: THREE.MeshStandardMaterial;
  private readonly sparkMaterial: THREE.MeshBasicMaterial;
  private readonly shockwaveMaterial: THREE.MeshBasicMaterial;

  constructor(
    readonly tiles: GridPos[],
    readonly ownerId: string,
    duration: number,
    private readonly renderer: RendererSystem,
    style: ExplosionStyle = GAME_CONFIG.visuals.explosionStyle,
    quality: ExplosionQuality = GAME_CONFIG.visuals.explosionQuality,
  ) {
    this.duration = duration;
    this.timer = duration;
    this.style = style;
    this.quality = quality;
    this.palette = STYLE_PALETTES[style];
    this.group.name = `Explosion:${style}:${quality}`;

    this.heatMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.core,
      emissive: this.palette.edge,
      emissiveIntensity: style === 'cyber' ? 2.8 : 2.35,
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
    });
    this.flameMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.core,
      emissive: this.palette.edge,
      emissiveIntensity: style === 'realistic' ? 3.1 : 2.7,
      transparent: true,
      opacity: 0.78,
      roughness: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sparkMaterial = new THREE.MeshBasicMaterial({ color: this.palette.spark });
    this.shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.shockwave,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    if (quality === 'high') {
      this.flashLight = new THREE.PointLight(this.palette.light, 4.2, 7.5, 2.2);
    }

    this.group.add(this.heatTiles, this.flameColumns, this.shockwave);
    if (this.flashLight) this.group.add(this.flashLight);
    this.buildBlastTiles();
    this.buildShockwave();
    this.buildParticles();
  }

  update(delta: number): boolean {
    this.timer -= delta;
    const age = 1 - Math.max(0, this.timer) / this.duration;
    const attack = Math.min(age / 0.18, 1);
    const fade = Math.max(0, 1 - age);
    const pulse = 1 + Math.sin(age * Math.PI * 7) * 0.08 * fade;

    this.heatMaterial.opacity = 0.82 * fade;
    this.heatMaterial.emissiveIntensity = 1.4 + 2.7 * fade;
    this.flameMaterial.opacity = 0.72 * fade;
    this.flameMaterial.emissiveIntensity = 1.1 + 3.2 * fade;
    this.flameColumns.scale.set(pulse, 0.75 + attack * 0.55, pulse);

    this.shockwave.scale.setScalar(0.35 + age * 3.8);
    this.shockwaveMaterial.opacity = Math.max(0, 0.62 * (1 - age * 1.7));
    if (this.flashLight) this.flashLight.intensity = 5.8 * Math.max(0, 1 - age * 2.2);

    this.updateSparks(delta, age);
    this.updateSmoke(delta, age);
    this.updateScorch(age);

    return this.timer <= 0;
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.heatGeometry.dispose();
    this.flameGeometry.dispose();
    this.sparkGeometry.dispose();
    this.smokeGeometry.dispose();
    this.scorchGeometry.dispose();
    this.shockwaveGeometry.dispose();
    this.heatMaterial.dispose();
    this.flameMaterial.dispose();
    this.sparkMaterial.dispose();
    this.shockwaveMaterial.dispose();
    for (const puff of this.smoke) puff.material.dispose();
    for (const mark of this.scorchMarks) mark.material.dispose();
  }

  private buildBlastTiles(): void {
    for (const tile of this.tiles) {
      const world = this.renderer.gridToWorld(tile);

      const heat = new THREE.Mesh(this.heatGeometry, this.heatMaterial);
      heat.position.copy(world);
      heat.position.y = 0.08;
      heat.receiveShadow = false;
      this.heatTiles.add(heat);

      const flame = new THREE.Mesh(this.flameGeometry, this.flameMaterial);
      flame.position.copy(world);
      flame.position.y = 0.62;
      flame.rotation.y = (tile.x * 17 + tile.y * 31) % Math.PI;
      if (this.quality !== 'low') this.flameColumns.add(flame);

      if (this.quality === 'high' || (this.quality === 'balanced' && this.scorchMarks.length < 4)) {
        const markMaterial = new THREE.MeshBasicMaterial({
          color: 0x09090b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mark = new THREE.Mesh(this.scorchGeometry, markMaterial);
        mark.rotation.x = -Math.PI / 2;
        mark.position.copy(world);
        mark.position.y = 0.012;
        this.scorchMarks.push({ mesh: mark, material: markMaterial });
        this.group.add(mark);
      }
    }
  }

  private buildShockwave(): void {
    const origin = this.tiles[0];
    if (!origin) return;
    const world = this.renderer.gridToWorld(origin);
    const ring = new THREE.Mesh(this.shockwaveGeometry, this.shockwaveMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(world);
    ring.position.y = 0.18;
    this.shockwave.add(ring);
    if (this.flashLight) {
      this.flashLight.position.copy(world);
      this.flashLight.position.y = 1.1;
    }
  }

  private buildParticles(): void {
    if (this.quality === 'low') return;

    const sparkCountPerTile = this.quality === 'high' ? (this.style === 'realistic' ? 5 : 4) : 1;
    const smokeCountPerTile = this.quality === 'high' ? (this.style === 'cyber' ? 1 : 2) : 0;
    const maxSparks = this.quality === 'high' ? 80 : 10;

    for (const tile of this.tiles) {
      const world = this.renderer.gridToWorld(tile);
      for (let i = 0; i < sparkCountPerTile; i += 1) {
        if (this.sparks.length >= maxSparks) break;
        const spark = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial);
        spark.position.set(
          world.x + (Math.random() - 0.5) * 0.36,
          0.28 + Math.random() * 0.38,
          world.z + (Math.random() - 0.5) * 0.36,
        );
        spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const outward = new THREE.Vector3(world.x, 0, world.z).normalize();
        if (outward.lengthSq() < 0.01) outward.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        const velocity = outward
          .multiplyScalar(1.5 + Math.random() * 2.6)
          .add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2));
        this.sparks.push({
          mesh: spark,
          velocity,
          spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        });
        this.group.add(spark);
      }

      for (let i = 0; i < smokeCountPerTile; i += 1) {
        const material = new THREE.MeshStandardMaterial({
          color: this.palette.smoke,
          transparent: true,
          opacity: 0,
          roughness: 0.95,
          depthWrite: false,
        });
        const puff = new THREE.Mesh(this.smokeGeometry, material);
        puff.position.set(
          world.x + (Math.random() - 0.5) * 0.42,
          0.45 + Math.random() * 0.25,
          world.z + (Math.random() - 0.5) * 0.42,
        );
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 0.38, 0.45 + Math.random() * 0.45, (Math.random() - 0.5) * 0.38);
        this.smoke.push({ mesh: puff, material, velocity });
        this.group.add(puff);
      }
    }
  }

  private updateSparks(delta: number, age: number): void {
    const visible = Math.max(0, 1 - age * 1.85);
    for (const spark of this.sparks) {
      spark.velocity.y -= 4.2 * delta;
      spark.mesh.position.addScaledVector(spark.velocity, delta);
      spark.mesh.rotation.x += spark.spin.x * delta;
      spark.mesh.rotation.y += spark.spin.y * delta;
      spark.mesh.rotation.z += spark.spin.z * delta;
      spark.mesh.scale.setScalar(Math.max(0.01, visible));
      spark.mesh.visible = visible > 0.02;
    }
  }

  private updateSmoke(delta: number, age: number): void {
    const smokeRise = Math.min(1, age / 0.55);
    const smokeFade = Math.max(0, 1 - Math.abs(age - 0.58) / 0.48);
    for (const puff of this.smoke) {
      puff.mesh.position.addScaledVector(puff.velocity, delta);
      puff.mesh.scale.setScalar(0.55 + smokeRise * 1.5);
      puff.material.opacity = this.style === 'cyber' ? smokeFade * 0.12 : smokeFade * 0.34;
    }
  }

  private updateScorch(age: number): void {
    const opacity = Math.max(0, Math.min(0.28, (age - 0.12) * 0.9)) * Math.max(0, 1 - age * 0.5);
    for (const mark of this.scorchMarks) {
      mark.material.opacity = opacity;
      mark.mesh.scale.setScalar(0.75 + age * 0.45);
    }
  }
}
