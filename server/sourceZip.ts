import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Builds a ZIP archive of the project source tree on demand.
 * No third-party archiver dependency — the ZIP container is written directly.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

const crc32 = (buf: Buffer): number => {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
};

interface ZipEntry {
  name: string;
  data: Buffer;
  crc: number;
  compressed: Buffer;
  method: number;
}

const dosDateTime = (date: Date) => {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
};

const writeZip = (entries: ZipEntry[]): Buffer => {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const { time, day } = dosDateTime(new Date());
    const nameBuf = Buffer.from(entry.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    local.writeUInt16LE(entry.method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(entry.crc, 14);
    local.writeUInt32LE(entry.compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, entry.compressed);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(entry.method, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(day, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressed.length, 20);
    header.writeUInt32LE(entry.data.length, 24);
    header.writeUInt16LE(nameBuf.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    header.writeUInt32LE(offset, 42);

    central.push(header, nameBuf);
    offset += local.length + nameBuf.length + entry.compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, end]);
};

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', '.data', '.cache', '.claude', 'prisma']);
const INCLUDED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html', '.md',
  '.yml', '.yaml', '.env.example', '.gitignore', '.dockerignore', '.txt'
]);
const INCLUDED_FILES = new Set([
  'package.json', 'package-lock.json', 'bun.lock', 'tsconfig.json', 'vite.config.ts',
  'index.html', 'Dockerfile', 'docker-compose.yml', 'README.md', 'metadata.json',
  '.env.example', '.gitignore'
]);
// Legacy standalone files that are not part of the running application.
const EXCLUDED_FILES = new Set(['index.js']);

const collect = (root: string, dir: string, out: string[]): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example' && entry.name !== '.gitignore') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collect(root, full, out);
      continue;
    }
    const rel = path.relative(root, full).split(path.sep).join('/');
    const ext = path.extname(entry.name);
    if (EXCLUDED_FILES.has(rel) || EXCLUDED_FILES.has(entry.name)) continue;
    if (INCLUDED_FILES.has(rel) || INCLUDED_FILES.has(entry.name) || INCLUDED_EXTENSIONS.has(ext)) {
      out.push(rel);
    }
  }
};

export interface SourceZip {
  buffer: Buffer;
  fileCount: number;
}

export const buildSourceZip = (root: string): SourceZip => {
  const relatives: string[] = [];
  collect(root, root, relatives);
  relatives.sort();

  const entries: ZipEntry[] = [];

  for (const rel of relatives) {
    const full = path.join(root, rel);
    let data: Buffer;
    try {
      data = fs.readFileSync(full);
    } catch {
      continue;
    }
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const useDeflate = compressed.length < data.length;
    entries.push({
      name: rel,
      data,
      crc: crc32(data),
      compressed: useDeflate ? compressed : data,
      method: useDeflate ? 8 : 0
    });
  }

  return { buffer: writeZip(entries), fileCount: entries.length };
};
