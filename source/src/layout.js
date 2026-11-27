// World layout, measured by un-projecting reference frames onto the ground plane.
// X runs along the sawmill fence (screen up-right), Z towards the camera (screen down-right).
export const L = {
  yard: { x0: -3.4, x1: 10.1, z0: -5.5, z1: 9.0 },
  expand: { x1: 13.3, z1: 3.9 },
  shed: { x: 6.5, z: -4.925, len: 5.5, depth: 1.35 },
  sawWorkers: [{ x: 4.7, z: -3.72 }, { x: 7.3, z: -3.72 }],
  logPallets: [{ x: 4.68, z: -2.3 }, { x: 7.55, z: -2.4 }],
  zone25: { x: 0.7, z: -3.6 },
  coalBench: { x: -0.35, z: -4.15 },
  coalWorker: { x: 1.55, z: -3.6 },
  coalPallet: { x: 0.6, z: -1.8 },
  start: { x: 0.9, z: -0.35 },
  coalTable: { x: -2.83, z: 0.55, ry: -Math.PI / 2 },
  coalZone: { x: -0.85, z: 0.4 },
  woodTable: { x: 2.0, z: 3.1, ry: 0 },
  woodZone: { x: 1.95, z: 1.3 },
  zone40: { x: 8.2, z: 1.35 },
  furnace: { x: 8.0, z: 6.3 },
  crates: { x: 5.9, z: 7.3 },
  newTable: { x: 8.9, z: 1.9, ry: Math.PI / 2 },
  zone100a: { x: 11.1, z: -3.2 },
  zone100b: { x: 11.4, z: 0.9 },
  queue: { x: 3.05, z: 4.5, dx: 0.16, dz: 0.98 },
  gate: { x0: 1.4, x1: 5.4 },
  carLane: { x: -5.75, z: -8.3, stopZ: 0.75, gap: 5.1 },
  table: { len: 3.8, depth: 0.95, regX: -0.05, stockX: 1.1, cashX: -1.3 },
};

// local table coordinates -> world
export function tableToWorld(t, lx, lz) {
  const c = Math.cos(t.ry), s = Math.sin(t.ry);
  return [t.x + lx * c + lz * s, t.z - lx * s + lz * c];
}

// Camera basis on the ground (screen right / screen up), matching the reference's opening shot.
export const CAM = {
  R: { x: 0.793, z: 0.609 },
  F: { x: 0.609, z: -0.793 },
  pitch: (45 * Math.PI) / 180,
  fov: 30,
  designW: 10.9, // world units across a 720px-wide reference frame
  designH: 13.64,
};
