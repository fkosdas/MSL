import * as fs from 'fs';
import * as path from 'path';

const dir = './src';

const replacements = [
  { regex: /bg-slate-950/g, replace: 'bg-background' },
  { regex: /bg-slate-900/g, replace: 'bg-card' },
  { regex: /bg-slate-800/g, replace: 'bg-surface' },
  { regex: /bg-slate-700/g, replace: 'bg-surface-hover' },
  { regex: /text-slate-200/g, replace: 'text-foreground' },
  { regex: /text-white/g, replace: 'text-foreground' },
  { regex: /text-slate-300/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-400/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-500/g, replace: 'text-dim-foreground' },
  { regex: /border-slate-800/g, replace: 'border-border' },
  { regex: /border-slate-700/g, replace: 'border-border-strong' },
  { regex: /border-slate-900/g, replace: 'border-background' },
  { regex: /text-slate-800/g, replace: 'text-foreground-inverse' },
  { regex: /text-slate-900/g, replace: 'text-foreground-inverse' },
  { regex: /text-slate-700/g, replace: 'text-foreground-inverse' },
  { regex: /text-slate-600/g, replace: 'text-dim-foreground' }
];

function walkDir(currentPath: string) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replace } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkDir(dir);
