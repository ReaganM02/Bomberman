import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;

    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      this.onloadend?.();
    }

    async readAsDataURL(blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
      this.onloadend?.();
    }
  };
}

const outDir = path.resolve('public/assets/models');
await mkdir(outDir, { recursive: true });

function material(color, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

function zRotationQuaternions(values) {
  return values.flatMap((z) => {
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, z));
    return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
  });
}

const root = new THREE.Group();
root.name = 'SoftCareBomber';

const softWhite = material(0xf8fafc, 0.86);
const softShadow = material(0xe2e8f0, 0.9);
const faceBlack = material(0x111827, 0.62);
const teamAccent = material(0x38bdf8, 0.62);

const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 20), softWhite);
body.name = 'Body';
body.position.y = 0.72;
body.scale.set(1.02, 1.34, 0.86);
body.castShadow = true;
root.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 18), softWhite);
head.name = 'Head';
head.position.y = 1.36;
head.scale.set(1.06, 0.78, 0.9);
head.castShadow = true;
root.add(head);

for (const x of [-0.105, 0.105]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), faceBlack);
  eye.name = x < 0 ? 'LeftEye' : 'RightEye';
  eye.position.set(x, 1.38, -0.294);
  root.add(eye);
}

const faceLine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), faceBlack);
faceLine.name = 'FaceLine';
faceLine.position.set(0, 1.38, -0.298);
root.add(faceLine);

for (const x of [-0.47, 0.47]) {
  const side = x < 0 ? 'Left' : 'Right';
  const armPivot = new THREE.Group();
  armPivot.name = `${side}Arm`;
  armPivot.position.set(x, 0.98, -0.01);
  armPivot.rotation.z = x < 0 ? 0.26 : -0.26;

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.44, 8, 16), softWhite);
  arm.name = `${side}Forearm`;
  arm.position.y = -0.29;
  arm.castShadow = true;

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), softWhite);
  hand.name = `${side}Hand`;
  hand.position.set(0, -0.57, -0.01);
  hand.scale.set(1.05, 0.92, 1);
  hand.castShadow = true;

  armPivot.add(arm, hand);
  root.add(armPivot);
}

const chestPanel = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 10), teamAccent);
chestPanel.name = 'TeamPanel';
chestPanel.position.set(0, 0.82, -0.39);
chestPanel.scale.set(1, 0.34, 0.16);
chestPanel.castShadow = true;
root.add(chestPanel);

for (const x of [-0.22, 0.22]) {
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), softShadow);
  foot.name = x < 0 ? 'LeftFoot' : 'RightFoot';
  foot.position.set(x, 0.14, -0.05);
  foot.scale.set(1.15, 0.48, 1.5);
  foot.castShadow = true;
  root.add(foot);
}

const times = [0, 0.5, 1];
const idleTrack = new THREE.VectorKeyframeTrack('.position', times, [0, 0, 0, 0, 0.055, 0, 0, 0, 0]);
const idleLeftArmTrack = new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', times, zRotationQuaternions([0.26, 0.22, 0.26]));
const idleRightArmTrack = new THREE.QuaternionKeyframeTrack('RightArm.quaternion', times, zRotationQuaternions([-0.26, -0.22, -0.26]));
const runTrack = new THREE.VectorKeyframeTrack('.scale', [0, 0.14, 0.28], [1, 1, 1, 1.08, 0.93, 1.08, 1, 1, 1]);
const runLeftArmTrack = new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', [0, 0.14, 0.28], zRotationQuaternions([0.08, 0.5, 0.08]));
const runRightArmTrack = new THREE.QuaternionKeyframeTrack('RightArm.quaternion', [0, 0.14, 0.28], zRotationQuaternions([-0.5, -0.08, -0.5]));
const deathTrack = new THREE.VectorKeyframeTrack('.scale', [0, 0.3, 0.8], [1, 1, 1, 1.15, 0.65, 1.15, 0.08, 0.08, 0.08]);
const victoryTrack = new THREE.VectorKeyframeTrack('.position', [0, 0.2, 0.42, 0.65], [0, 0, 0, 0, 0.36, 0, 0, 0, 0, 0, 0.18, 0]);
const victoryLeftArmTrack = new THREE.QuaternionKeyframeTrack(
  'LeftArm.quaternion',
  [0, 0.2, 0.42, 0.65],
  zRotationQuaternions([0.26, 0.82, 0.26, 0.62]),
);
const victoryRightArmTrack = new THREE.QuaternionKeyframeTrack(
  'RightArm.quaternion',
  [0, 0.2, 0.42, 0.65],
  zRotationQuaternions([-0.26, -0.82, -0.26, -0.62]),
);

const clips = [
  new THREE.AnimationClip('idle', 1, [idleTrack, idleLeftArmTrack, idleRightArmTrack]),
  new THREE.AnimationClip('run', 0.28, [runTrack, runLeftArmTrack, runRightArmTrack]),
  new THREE.AnimationClip('death', 0.8, [deathTrack]),
  new THREE.AnimationClip('victory', 0.65, [victoryTrack, victoryLeftArmTrack, victoryRightArmTrack]),
];

const exporter = new GLTFExporter();
const arrayBuffer = await exporter.parseAsync(root, { binary: true, animations: clips });
await writeFile(path.join(outDir, 'blastgrid-runner.glb'), Buffer.from(arrayBuffer));
console.log('Generated public/assets/models/blastgrid-runner.glb');
