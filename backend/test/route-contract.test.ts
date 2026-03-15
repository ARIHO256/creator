import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

async function collectControllerFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectControllerFiles(nextPath);
      }
      return entry.name.endsWith('.controller.ts') ? [nextPath] : [];
    })
  );
  return files.flat();
}

test('Nest controller route contract includes critical live/settings routes and broad handler coverage', async () => {
  const modulesDir = new URL('../src/modules', import.meta.url);
  const controllerFiles = await collectControllerFiles(modulesDir.pathname);
  const contents = await Promise.all(controllerFiles.map((file) => readFile(file, 'utf8')));

  const handlerCount = contents.reduce((count, source) => {
    const matches = source.match(/@(Get|Post|Patch|Delete|Put)\(/g);
    return count + (matches?.length ?? 0);
  }, 0);

  assert.ok(contents.some((source) => source.includes("@Get('live/studio/default')")));
  assert.ok(contents.some((source) => source.includes("@Patch('roles/security')")));
  assert.ok(handlerCount > 300);
});
