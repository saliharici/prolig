import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('API Imports', () => {
  it('should only contain ESM-safe local imports in API routes', () => {
    function findTsFiles(dir: string, fileList: string[] = []) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          findTsFiles(fullPath, fileList);
        } else if (fullPath.endsWith('.ts')) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const apiFiles = findTsFiles(path.join(process.cwd(), 'api'));
    let foundMissing = false;
    const errors: string[] = [];

    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('from') || line.includes('import(')) {
          const match = line.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            if (!importPath.endsWith('.js')) {
              errors.push(`Missing extension in ${file}: ${importPath}`);
              foundMissing = true;
            }
          }
        }
      }
    }

    expect(errors).toEqual([]);
    expect(foundMissing).toBe(false);
  });
});
