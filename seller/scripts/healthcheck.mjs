import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const missing = [];
const has = (p) => fs.existsSync(path.join(root,p));

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const scripts = pkg.scripts || {};

function check(ok, okMsg, failMsg){
  console.log(ok ? `✅ ${okMsg}` : `❌ ${failMsg}`);
  if (!ok) missing.push(failMsg);
}

check(!!pkg, 'package.json present', 'package.json missing');
['start','build','test'].forEach(s => check(!!scripts[s], `"${s}" script present`, `"${s}" script missing`));
check(has('public/index.html'), 'public/index.html present', 'public/index.html missing');
check(has('src/index.js') || has('src/index.jsx'), 'src/index entry present', 'src/index entry missing');
check(has('.env.example'), '.env.example present', '.env.example missing');
const hasEslint = ['.eslintrc.js','.eslintrc.cjs','.eslintrc.json','eslint.config.js'].some(has);
check(hasEslint, 'ESLint config present', 'ESLint config missing');
const hasPrettier = ['.prettierrc','.prettierrc.json','.prettierrc.js','prettier.config.js'].some(has);
check(hasPrettier, 'Prettier config present', 'Prettier config missing');
check(has('tailwind.config.js'), 'tailwind.config.js present', 'tailwind.config.js missing');
check(has('postcss.config.js'), 'postcss.config.js present', 'postcss.config.js missing');

process.on('exit', () => {
  if (missing.length){
    console.log('\n⚠️  Healthcheck failed:');
    missing.forEach(m => console.log(' -', m));
    process.exit(1);
  } else {
    console.log('\n🎉 Plug-and-play looks good!');
  }
});
