import * as THREE from 'three';
import { TILE_SIZE, GAME_CONFIG } from '../config/GameConfig';
import type { CameraShakeRequest, GridPos } from '../core/Types';

export class RendererSystem {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new THREE.Group();
  readonly debugGroup = new THREE.Group();

  private readonly baseCameraPosition = new THREE.Vector3();
  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private debugVisible = GAME_CONFIG.debug.enabledByDefault;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.scene.background = new THREE.Color(0x111827);
    this.scene.add(this.world, this.debugGroup);
    this.debugGroup.visible = this.debugVisible;

    const ambient = new THREE.HemisphereLight(0xe0f2fe, 0x172554, 1.6);
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(8, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    this.scene.add(ambient, sun);

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  gridToWorld(pos: GridPos): THREE.Vector3 {
    return new THREE.Vector3(
      (pos.x - (GAME_CONFIG.board.width - 1) / 2) * TILE_SIZE,
      0,
      (pos.y - (GAME_CONFIG.board.height - 1) / 2) * TILE_SIZE,
    );
  }

  centerCameraOnArena(width: number, height: number): void {
    const boardCenter = this.gridToWorld({ x: (width - 1) / 2, y: (height - 1) / 2 });
    this.baseCameraPosition.set(boardCenter.x, 14, boardCenter.z + 13.5);
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(boardCenter.x, 0, boardCenter.z);
  }

  requestShake(request: CameraShakeRequest): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, request.intensity);
    this.shakeDuration = Math.max(this.shakeDuration, request.duration);
    this.shakeTime = this.shakeDuration;
  }

  update(delta: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - delta);
      const amount = (this.shakeTime / this.shakeDuration) * this.shakeIntensity;
      this.camera.position.set(
        this.baseCameraPosition.x + (Math.random() - 0.5) * amount,
        this.baseCameraPosition.y + (Math.random() - 0.5) * amount * 0.35,
        this.baseCameraPosition.z + (Math.random() - 0.5) * amount,
      );
    } else {
      this.camera.position.lerp(this.baseCameraPosition, 1 - Math.exp(-GAME_CONFIG.camera.shakeDecay * delta));
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  toggleDebug(): boolean {
    this.debugVisible = !this.debugVisible;
    this.debugGroup.visible = this.debugVisible;
    return this.debugVisible;
  }

  clearWorld(): void {
    this.world.clear();
    this.debugGroup.clear();
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const frustum = GAME_CONFIG.camera.zoom / 3.2;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
  };
}
