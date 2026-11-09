// 게임 빌드(packages/game/dist)와 캐릭터 그림을 사이트 public/로 복사한다.
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
const game = new URL('../../game/', import.meta.url).pathname;
const pub = new URL('../public/', import.meta.url).pathname;
if (!existsSync(game + 'dist/index.html')) { console.error('게임 빌드가 없어요. packages/game에서 npm run build 먼저.'); process.exit(1); }
rmSync(pub + 'game', { recursive: true, force: true });
cpSync(game + 'dist', pub + 'game', { recursive: true });
mkdirSync(pub + 'chars', { recursive: true });
for (const f of readdirSync(game + 'src/assets/chars')) if (/_(card|por)\.png$/.test(f)) cpSync(game + 'src/assets/chars/' + f, pub + 'chars/' + f);
mkdirSync(pub + 'fonts', { recursive: true });
for (const f of ['Galmuri11.woff2', 'Galmuri11-Bold.woff2']) cpSync(game + 'src/assets/' + f, pub + 'fonts/' + f);
console.log('게임 · 캐릭터 그림 · 글꼴 복사 완료');
