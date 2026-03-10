const fs = require('fs');
const path = require('path');
const srcPath = path.resolve(__dirname, '../src/features/livedealz/LiveSessionz/3_LiveSessionStudio.jsx');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split('\n');
const upto = lines.length; // scan whole file
const text = lines.join('\n');
const tagRegex = /<\/([A-Za-z][A-Za-z0-9:-]*)>|<([A-Za-z][A-Za-z0-9:-]*)(?=[\s/>])[^>]*?(\/?)>/g;
let stack = [];
let pos = 0;
while (true) {
  const match = tagRegex.exec(text);
  if (!match) break;
  const index = match.index;
  // compute line number
  const before = text.slice(0, index);
  const lineNum = before.split('\n').length;
  if (match[1]) {
    const name = match[1];
    const top = stack.pop();
    console.log(`Closing </${name}> at line ${lineNum}, expected </${top}>`);
    if (!top || top.toLowerCase() !== name.toLowerCase()) {
      console.error('Mismatch closing', name, 'expected', top);
      console.error('Stack snapshot:', stack.slice(-40));
      process.exit(0);
    }
  } else if (match[2]) {
    const name = match[2];
    const self = match[3];
    const voids = ['input','img','br','hr','meta','link'];
    if (self === '/' || voids.includes(name.toLowerCase())) {
      console.log(`Self-closing <${name}/> at line ${lineNum}`);
    } else {
      stack.push(name);
      console.log(`Open <${name}> at line ${lineNum}, stack depth ${stack.length}`);
    }
  }
}
console.log('Done scanning. Remaining stack length:', stack.length);
console.log('Stack top items:', stack.slice(-20));
