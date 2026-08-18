import { readFileSync } from 'fs';
const content = readFileSync('/workspace/sortirici/src/pages/departement/[num].astro', 'utf-8');
const lines = content.split('\n');
const line = lines[133]; // 0-indexed, line 134 is index 133
console.log(`Line 134: ${line}`);
console.log(`Length: ${line.length}`);
console.log(`Char at 44: "${line[44]}" (code: ${line.charCodeAt(44)})`);
console.log(`Context around 44: "${line.substring(40, 50)}"`);