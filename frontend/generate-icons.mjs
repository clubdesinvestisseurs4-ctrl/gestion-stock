#!/usr/bin/env node
// Génère public/icons/icon-192.png et icon-512.png sans dépendances externes
import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

/* ── CRC32 ── */
const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = (CRC[(c ^ b) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) | 0;
}
function chunk(type, data) {
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const cr = Buffer.alloc(4); cr.writeInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, cr]);
}

/* ── Dessin ── */
function makePNG(size) {
  const px = new Uint8Array(size * size * 4);

  function fill(x1, y1, x2, y2, r, g, b, a = 255) {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const i = (y * size + x) * 4;
        px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
      }
    }
  }

  // Toutes les coordonnées sont en base 192, mises à l'échelle
  const k = size / 192;
  const r = (x1, y1, x2, y2, cr, cg, cb) =>
    fill(Math.round(x1*k), Math.round(y1*k), Math.round(x2*k), Math.round(y2*k), cr, cg, cb);

  const G  = [0x1a, 0x6b, 0x3c]; // vert foncé
  const W  = [255, 255, 255];     // blanc
  const L  = [0x15, 0x55, 0x30];  // vert plus foncé (ombre)

  // Fond vert
  fill(0, 0, size, size, ...G);

  // Coins arrondis (découpe en vert foncé)
  const rad = Math.round(28 * k);
  for (let y = 0; y < rad; y++) {
    for (let x = 0; x < rad; x++) {
      const dx = rad - x, dy = rad - y;
      if (dx*dx + dy*dy > rad*rad) {
        fill(x, y, x+1, y+1, 0,0,0, 0);                   // coin haut-gauche
        fill(size-x-1, y, size-x, y+1, 0,0,0, 0);          // coin haut-droit
        fill(x, size-y-1, x+1, size-y, 0,0,0, 0);          // coin bas-gauche
        fill(size-x-1, size-y-1, size-x, size-y, 0,0,0, 0);// coin bas-droit
      }
    }
  }

  // Corps de la boîte (blanc)
  r(44, 86, 148, 154, ...W);
  // Couvercle de la boîte (blanc, légèrement plus large)
  r(44, 56, 148, 86, ...W);
  // Ligne de séparation couvercle/corps (ombre subtile)
  r(44, 83, 148, 87, 220, 220, 220);

  // Ruban vertical (vert sur blanc)
  r(87, 56, 105, 154, ...G);
  // Ruban horizontal (vert sur blanc)
  r(44, 110, 148, 126, ...G);

  // Nœud du ruban (deux petits rectangles blancs arrondis sur le dessus)
  r(62, 46, 87, 62, ...W);   // côté gauche du nœud
  r(105, 46, 130, 62, ...W); // côté droit du nœud

  // Encode PNG RGBA
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      const s2 = (y * size + x) * 4;
      const d  = y * rowSize + 1 + x * 4;
      raw[d]   = px[s2]; raw[d+1] = px[s2+1];
      raw[d+2] = px[s2+2]; raw[d+3] = px[s2+3];
    }
  }

  const def = zlib.deflateSync(raw, { level: 6 });
  const wh  = Buffer.alloc(8);
  wh.writeUInt32BE(size, 0); wh.writeUInt32BE(size, 4);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.concat([wh, Buffer.from([8, 6, 0, 0, 0])])),
    chunk('IDAT', def),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const buf  = makePNG(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ ${file}  (${(buf.length/1024).toFixed(1)} KB)`);
}
console.log('Icons generated!');
