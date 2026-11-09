import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const inkjs = createRequire(import.meta.url)('inkjs'); // 빌드 시 컴파일용 (full 빌드)

// .ink 원고를 빌드할 때 JSON으로 컴파일한다. 문법 오류는 빌드 실패로 바로 드러난다.
function inkPlugin(): Plugin {
  return {
    name: 'ink-compile',
    transform(_code, id) {
      if (!id.endsWith('.ink')) return null;
      // INCLUDE 파일명.ink 줄은 같은 폴더의 파일 내용으로 바꿔 넣는다
      const dir = id.replace(/[^/\\]+$/, '');
      const src = readFileSync(id, 'utf8').replace(/^INCLUDE\s+(\S+)\s*$/gm, (_m, f) => { this.addWatchFile(dir + f); return readFileSync(dir + f, 'utf8'); });
      const errors: string[] = [];
      const compiler = new (inkjs as any).Compiler(src, new (inkjs as any).CompilerOptions(null, [], false, (msg: string, type: number) => {
        if (type === 2) errors.push(msg);
      }));
      const story = compiler.Compile();
      if (errors.length || !story) throw new Error('Ink 컴파일 실패:\n' + errors.join('\n'));
      return { code: `export default ${JSON.stringify(story.ToJson())};`, map: null };
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [inkPlugin(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 4000,
  },
}));
