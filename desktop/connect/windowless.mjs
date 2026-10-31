// Marks a Windows program as having no console window. Usage: node windowless.mjs <file.exe>
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const bytes = readFileSync(file);
const pe = bytes.readUInt32LE(0x3c);
if (bytes.toString('latin1', pe, pe + 4) !== 'PE\0\0') throw new Error('not a Windows program');
// The optional header follows the 24-byte file header; the subsystem is 68 bytes into it
const at = pe + 24 + 68;
if (bytes.readUInt16LE(at) !== 3) throw new Error(`expected a console program, found subsystem ${bytes.readUInt16LE(at)}`);
bytes.writeUInt16LE(2, at);
writeFileSync(file, bytes);
console.log('now has no console window');
