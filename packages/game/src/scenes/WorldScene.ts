// 필드 씬: 구름 위의 마을 (1막)
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { Bus, GameState } from '../systems/GameState';
import { Story1 } from '../systems/StoryRunner';
import { CHAR_IDS, charById, WALK, DIR_ROW, type CharId, type Dir } from '../data/characters';
import {
  TILE, COLS, ROWS, BLOCKING, buildGrid, MEMBER_SPOTS, POINT_SPOT, START_SPOT, BUG_NOTES, SIGNS, type Tile,
  STAR_PIECES, LETTERS, VILLAGERS, TOWER_SPOT, STATION_SPOT, SQ02_NOTE,
} from '../world/cloudVillage';
import { paintMap, makeFolk, makeQuestProps } from '../gfx/paint';
import { questLog, ITEM_NAMES } from '../data/quests';
import { Audio } from '../systems/AudioManager';
import { REGIONS, regionById, MAP_ORDER, BLOCK, type RegionMap } from '../world/maps';
import { THEMES, paintRegionMap, makeSky, propTexture, propUp } from '../gfx/region';
import { SaveManager } from '../systems/SaveManager';
import { runDialogue, toast, UIState, FONT } from './UIScene';
import { glitchBurst } from './PrologueScene';
import { isTouchDevice } from '../ui/TouchPad';

const SWITCH_HINT = (n: number) => isTouchDevice() ? `아래 캐릭터 버튼(${n}번)` : `숫자키 ${n}`;

interface Actor { id: CharId; dir: Dir; spr: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text; x: number; y: number; flip: boolean; walk: number }
interface Npc { id: CharId; spr: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text; bubble: Phaser.GameObjects.Text; x: number; y: number }

const SPEED = 120, RUN = 195, FOLLOW_GAP = 16;
const key = (x: number, y: number) => `${x},${y}`;
const feetOf = (s: { x: number; y: number }) => ({ x: s.x * TILE + TILE / 2, y: (s.y + 1) * TILE - 2 });

export class WorldScene extends Phaser.Scene {
  private grid: string[][] = [];
  private mapId = 'cloud';
  private region?: RegionMap;
  private cols = COLS;
  private rows = ROWS;
  private pointSpot = POINT_SPOT;
  private signs: { x: number; y: number; text: string }[] = SIGNS;
  private vines = new Map<string, Phaser.GameObjects.Image>();
  private preview = false;
  private bridges = new Map<string, Phaser.GameObjects.Image>();
  private rocks = new Map<string, Phaser.GameObjects.Image>();
  private actors = new Map<CharId, Actor>();
  private npcs: Npc[] = [];
  private point!: Phaser.GameObjects.Image;
  private pointBubble!: Phaser.GameObjects.Text;
  private notes: { id: string; spr: Phaser.GameObjects.Image; text: string }[] = [];
  private tower!: Phaser.GameObjects.Image;
  private flowers: Phaser.GameObjects.Image[] = [];
  private hist: { x: number; y: number; flip: boolean }[] = [];
  private face = { x: 0, y: 1 };
  private abilityCd = 0;
  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private glitchCount = 0;
  private lock = false;
  private folks: { id: string; spr: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private pickups: { id: string; kind: 'piece' | 'letter'; spr: Phaser.GameObjects.Image }[] = [];
  private pendingRest = false;
  private skyStar?: Phaser.GameObjects.Image;

  constructor() { super('World'); }

  create(data: { from: 'new' | 'load' | 'travel'; map?: string }) {
    const d = GameState.data;
    this.mapId = data.map ?? (d.flags.map as string) ?? 'cloud';
    d.flags.map = this.mapId;
    this.preview = !!d.flags.preview;
    this.region = regionById(this.mapId);
    let props: import('../gfx/region').Prop[] = [];
    if (this.region) { const built = this.region.build(); this.grid = built.grid as string[][]; props = built.props; this.cols = this.region.cols; this.rows = this.region.rows; this.pointSpot = this.region.point ?? POINT_SPOT; this.signs = this.region.signs; }
    else { this.grid = buildGrid(); this.cols = COLS; this.rows = ROWS; this.pointSpot = POINT_SPOT; this.signs = SIGNS; }
    for (const k of d.brokenRocks) {
      const [m, xy] = k.includes(':') ? k.split(':') : ['cloud', k];
      if (m !== this.mapId) continue;
      const [x, y] = xy.split(',').map(Number); this.grid[y][x] = '=';
    }
    for (const k of Object.keys(d.flags)) if (k.startsWith(`bloom:${this.mapId}:`)) { const [x, y] = k.split(':')[2].split(',').map(Number); this.grid[y][x] = ','; }
    this.vines.clear();
    GameState.setFlag(`visit.${this.mapId}`);
    this.bridges.clear(); this.rocks.clear(); this.actors.clear(); this.npcs = []; this.notes = []; this.flowers = []; this.hist = []; this.glitchCount = 0; this.lock = false; this.folks = []; this.pickups = []; this.pendingRest = false; this.skyStar = undefined;

    if (this.region) {
      const th = THEMES[this.region.theme];
      makeSky(this, `sky_${this.region.theme}`, th);
      this.cameras.main.setBackgroundColor(th.sky[1]);
      this.sky = this.add.tileSprite(0, 0, 960, 540, `sky_${this.region.theme}`).setOrigin(0).setScrollFactor(0).setDepth(-20);
      this.far = this.add.tileSprite(0, 300, 960, 96, 'farcloud').setOrigin(0).setScrollFactor(0).setDepth(-19).setAlpha(th.edge === 'cliff' ? 0.35 : 0.8).setVisible(th.edge !== 'indoor');
      if (th.moon) { const m = this.add.circle(760, 90, 46, 0xf3e6ff).setScrollFactor(0.05).setDepth(-19).setAlpha(0.9); this.add.circle(760, 90, 70, 0xd3a9e1, 0.15).setScrollFactor(0.05).setDepth(-19); m.setStrokeStyle(4, 0xffffff, 0.4); }
      paintRegionMap(this, `map_${this.mapId}`, this.grid as any, th, this.region.secretAs);
      const night: Record<string, number> = { mirror: 0.16, garden: 0.22, shadow: 0.2, data: 0.1, studio: 0.08 };
      if (night[this.mapId]) this.add.rectangle(0, 0, 960, 540, Phaser.Display.Color.HexStringToColor(th.sky[0]).color, night[this.mapId]).setOrigin(0).setScrollFactor(0).setDepth(8000);
      this.add.image(0, 0, `map_${this.mapId}`).setOrigin(0).setDepth(-10);
      // 소품: 디자인 PNG(assets/props/<이름>.png)가 있으면 그걸, 없으면 코드로 그린 임시 그림
      props.forEach((p, i) => {
        const up = propUp(p.k), w = p.w * TILE, h = (p.h + up) * TILE;
        let tex = `propimg_${p.k}${p.color ? '_' + p.color.slice(1) : ''}`;
        if (!this.textures.exists(tex)) tex = this.textures.exists(`propimg_${p.k}`) ? `propimg_${p.k}` : '';
        if (!tex) { tex = `prop_${this.mapId}_${i}`; propTexture(this, tex, p, th); }
        const img = this.add.image(p.x * TILE, (p.y + p.h) * TILE, tex).setOrigin(0, 1).setDisplaySize(w, h);
        img.setDepth(p.walk ? -5 : (p.y + p.h) * TILE - 1);
      });
    } else {
      this.cameras.main.setBackgroundColor('#a9b6ff');
      this.sky = this.add.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-20);
      this.far = this.add.tileSprite(0, 300, 960, 96, 'farcloud').setOrigin(0).setScrollFactor(0).setDepth(-19).setAlpha(0.8);
      paintMap(this, 'map_cloud', this.grid as Tile[][]);
      this.add.image(0, 0, 'map_cloud').setOrigin(0).setDepth(-10);
    }

    // 바위 · 덩굴
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      if (this.grid[y][x] === 'X') this.rocks.set(key(x, y), this.add.image(x * TILE, y * TILE, 'rock').setOrigin(0).setDepth((y + 1) * TILE));
      if (this.grid[y][x] === 'V') this.vines.set(key(x, y), this.add.image(x * TILE, y * TILE, 'vine').setOrigin(0).setDepth((y + 1) * TILE));
    }
    if (this.region) this.buildRegionExtras();
    else this.buildCloudExtras(d);
    // 포인트
    const pf = feetOf(this.pointSpot);
    this.point = this.add.image(pf.x, pf.y - 20, 'point').setScale(1.4).setDepth(pf.y);
    this.tweens.add({ targets: this.point, y: pf.y - 28, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pointBubble = this.add.text(pf.x, pf.y - 64, '★', { fontFamily: FONT, fontSize: '24px', color: '#ffe27a' }).setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets: this.pointBubble, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    // 아직 합류하지 않은 별지기 (구름 마을에서만)
    if (!this.region) for (const id of CHAR_IDS) if (!d.party.includes(id)) this.spawnNpc(id);

    // 파티
    const spawnSpot = this.region ? this.region.spawn : START_SPOT;
    const start = data.from === 'load' && d.pos.x ? d.pos : feetOf(spawnSpot);
    d.party.forEach((id, i) => this.spawnActor(id, start.x - (i ? 10 : 0), start.y + (i ? 6 : 0)));
    // 따라오는 동료들이 리더 뒤에 한 줄로 서도록 발자취를 미리 깔아 둔다
    // 비어 있는 방향으로 발자취를 깐다 (아래 → 위 → 왼쪽 → 오른쪽)
    const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    const free = (dx: number, dy: number) => { let n = 0; for (let k = 4; k <= 140; k += 4) { if (!this.boxFree(start.x + dx * k, start.y + dy * k)) break; n = k; } return n; };
    const [bx, by] = dirs.reduce((best, d) => free(d[0], d[1]) > free(best[0], best[1]) ? d : best, dirs[0]);
    const reach = free(bx, by);
    for (let k = 200; k >= 0; k--) { const kk = Math.min(k, reach); this.hist.push({ x: start.x + bx * kk, y: start.y + by * kk, flip: false }); }
    d.party.filter(id => id !== d.leader).forEach((id, i) => { const a = this.actors.get(id)!, h = this.hist[this.hist.length - 1 - (i + 1) * FOLLOW_GAP]; a.x = h.x; a.y = h.y; });
    this.orderActors();

    const lead = this.actors.get(d.leader)!;
    this.cameras.main.setBounds(Math.min(0, (this.cols * TILE - 960) / 2), Math.min(0, (this.rows * TILE - 540) / 2), Math.max(960, this.cols * TILE), Math.max(540, this.rows * TILE)).startFollow(lead.spr, true, 0.12, 0.12).setRoundPixels(true);
    this.cameras.main.fadeIn(500, 255, 255, 255);

    Bus.emit('hud', true);
    const onTag = (t: string) => this.onTag(t);
    const onSpent = (h: number, why: string) => toast(`⏳ ${why} · ${h}시간 흘렀다`);
    const onUp = () => this.timeUp();
    Bus.on('tag', onTag); Bus.on('time-spent', onSpent); Bus.on('time-up', onUp);
    this.events.once('shutdown', () => { Bus.off('tag', onTag); Bus.off('time-spent', onSpent); Bus.off('time-up', onUp); Bus.emit('hud', false); Bus.emit('ui-reset'); });
    Audio.bgm(this.region ? this.region.bgm : 'village');

    if (data.from === 'new') this.time.delayedCall(700, () => runDialogue('arrive'));
    else if (data.from === 'travel') this.time.delayedCall(400, () => toast(`${this.region?.name ?? '구름 위의 마을'}${this.preview ? ' · 둘러보기 모드' : ''}`));
    else this.time.delayedCall(400, () => toast('이어서 시작해요.'));
  }

  // ---------- 지역별 구성 ----------
  private buildCloudExtras(d: typeof GameState.data) {
    // 시계탑
    this.tower = this.add.image(21 * TILE, 12 * TILE, 'tower').setOrigin(0.5, 1).setDepth(12 * TILE);
    if (GameState.flag('mq.gather') && !GameState.flag('mq.cloud')) this.tower.setVisible(false);
    makeQuestProps(this);
    if (GameState.flag('mq.cloud')) this.lightSkyStar(false);
    // 구름 주민
    for (const v of VILLAGERS) {
      makeFolk(this, `folk_${v.id}`, v.hat, v.id === 'piko' ? 'piko' : v.id === 'grandma' ? 'grandma' : 'folk');
      const f = feetOf(v);
      const spr = this.add.image(f.x, f.y + 2, `folk_${v.id}`).setOrigin(0.5, 1).setDepth(f.y).setScale(1.2);
      this.tweens.add({ targets: spr, scaleY: 1.14, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const tag = this.add.text(f.x, f.y + 3, this.folkName(v.id), { fontFamily: FONT, fontSize: '12px', color: '#e6e0ff', stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(f.y);
      const mark = this.add.text(f.x, f.y - 62, '…', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#e6e0ff', padding: { x: 5, y: 0 } }).setOrigin(0.5).setDepth(9000);
      this.folks.push({ id: v.id, spr, tag, mark, x: f.x, y: f.y });
    }
    this.refreshFolkMarks();
    this.spawnPickups();
    // 화단
    this.refreshFlowers();
    // 버그 노트
    this.spawnNotes(BUG_NOTES);
  }

  private spawnNotes(list: { id: string; x: number; y: number; text: string }[]) {
    const d = GameState.data;
    for (const n of list) if (!d.bugNotes.includes(n.id)) {
      const spr = this.add.image(n.x * TILE + TILE / 2, n.y * TILE + TILE / 2, 'note').setDepth((n.y + 1) * TILE);
      this.tweens.add({ targets: spr, y: spr.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.notes.push({ id: n.id, spr, text: n.text });
    }
  }

  private regionFolks: { id: string; name: string; lines: string[] }[] = [];
  private buildRegionExtras() {
    const r = this.region!;
    makeQuestProps(this);
    this.spawnNotes(r.notes);
    this.regionFolks = [];
    for (const n of r.npcs) {
      const id = `${r.id}_${n.id}`;
      makeFolk(this, `folk_${id}`, n.hat, 'folk');
      const f = feetOf(n);
      const spr = this.add.image(f.x, f.y + 2, `folk_${id}`).setOrigin(0.5, 1).setDepth(f.y).setScale(1.2);
      this.tweens.add({ targets: spr, scaleY: 1.14, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const tag = this.add.text(f.x, f.y + 3, n.name, { fontFamily: FONT, fontSize: '12px', color: '#e6e0ff', stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(f.y);
      const mark = this.add.text(f.x, f.y - 62, '…', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#e6e0ff', padding: { x: 5, y: 0 } }).setOrigin(0.5).setDepth(9000);
      this.folks.push({ id, spr, tag, mark, x: f.x, y: f.y });
      this.regionFolks.push({ id, name: n.name, lines: n.lines });
    }
  }

  // ---------- 생성 ----------
  private nameTag(id: CharId) {
    const c = charById(id);
    return this.add.text(0, 0, c.name, { fontFamily: FONT, fontSize: '12px', color: c.color, stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0);
  }
  private spawnActor(id: CharId, x: number, y: number) {
    const shadow = this.add.image(x, y, 'shadow');
    const spr = this.add.sprite(x, y, `${id}_walk`, 0).setOrigin(0.5, 1).setScale(WALK.scale);
    this.actors.set(id, { id, dir: 'down', spr, shadow, tag: this.nameTag(id), x, y, flip: false, walk: 0 });
  }
  private spawnNpc(id: CharId) {
    const f = feetOf(MEMBER_SPOTS[id]);
    const shadow = this.add.image(f.x, f.y, 'shadow').setDepth(f.y - 1);
    const spr = this.add.sprite(f.x, f.y, `${id}_walk`, 0).setOrigin(0.5, 1).setDepth(f.y).setScale(WALK.scale);
    const tag = this.nameTag(id).setPosition(f.x, f.y + 2).setDepth(f.y);
    const bubble = this.add.text(f.x, f.y - WALK.fh * WALK.scale - 14, '!', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#ffd66b', padding: { x: 7, y: 1 } }).setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets: bubble, y: bubble.y - 5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.npcs.push({ id, spr, shadow, tag, bubble, x: f.x, y: f.y });
  }
  private refreshFlowers() {
    this.flowers.forEach(f => f.destroy()); this.flowers = [];
    if (!GameState.inParty('haming')) return;
    const kind = String(Story1.getVar('flower') || 'yellow') === 'white' ? 'bloom_white' : 'bloom_yellow';
    if (this.region) return;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (this.grid[y][x] === 'f') {
      const b = this.add.image(x * TILE, y * TILE, kind).setOrigin(0).setDepth((y + 1) * TILE).setScale(1, 0);
      this.tweens.add({ targets: b, scaleY: 1, duration: 400, delay: (x + y) * 30, ease: 'Back.out' });
      this.flowers.push(b);
    }
  }

  // ---------- 지형 ----------
  private tileAt(px: number, py: number): string { const x = Math.floor(px / TILE), y = Math.floor(py / TILE); return (x < 0 || y < 0 || x >= this.cols || y >= this.rows) ? ' ' : this.grid[y][x]; }
  private blocked(t: string) {
    if (t === 'g') return GameState.data.leader !== 'shiro';
    return this.region ? BLOCK.has(t as any) : BLOCKING.has(t as Tile);
  }
  private solidAt(px: number, py: number) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (this.bridges.has(key(tx, ty))) return false;
    if (this.blocked(this.tileAt(px, py))) return true;
    for (const n of this.npcs) if (Math.abs(n.x - px) < 10 && Math.abs(n.y - 3 - py) < 6) return true;
    for (const n of this.folks) if (Math.abs(n.x - px) < 12 && Math.abs(n.y - 3 - py) < 6) return true;
    const pf = feetOf(this.pointSpot);
    return Math.abs(pf.x - px) < 10 && Math.abs(pf.y - 3 - py) < 6;
  }
  private boxFree(x: number, y: number) {
    return !this.solidAt(x - 7, y - 7) && !this.solidAt(x + 7, y - 7) && !this.solidAt(x - 7, y) && !this.solidAt(x + 7, y);
  }

  // ---------- 파티 ----------
  private get lead() { return this.actors.get(GameState.data.leader)!; }
  private followers(): Actor[] { const d = GameState.data; return d.party.filter(id => id !== d.leader).map(id => this.actors.get(id)!); }
  private orderActors() { this.cameras.main.startFollow(this.lead.spr, true, 0.12, 0.12); }

  private switchTo(id: CharId) {
    const d = GameState.data;
    if (id === d.leader || !d.party.includes(id) || this.lock) return;
    const a = this.lead, b = this.actors.get(id)!;
    // 새 리더가 지금 자리를 이어받고, 이전 리더는 바로 뒤에 선다
    const bx = b.x, by = b.y;
    b.x = a.x; b.y = a.y; b.flip = a.flip; b.dir = a.dir;
    a.x = bx; a.y = by;
    d.leader = id;
    this.orderActors();
    for (let i = 0; i < 10; i++) {
      const p = this.add.image(b.x + Phaser.Math.Between(-14, 14), b.y - Phaser.Math.Between(10, 70), 'pixel').setTint(Phaser.Display.Color.HexStringToColor(charById(id).color).color).setDepth(9500);
      this.tweens.add({ targets: p, y: p.y - 20, alpha: 0, duration: 400, onComplete: () => p.destroy() });
    }
    Bus.emit('hud-refresh');
    toast(`${charById(id).name}(으)로 교체`); Audio.sfx('switch');
  }
  private cycle() {
    const d = GameState.data; if (d.party.length < 2) return;
    const i = d.party.indexOf(d.leader); this.switchTo(d.party[(i + 1) % d.party.length]);
  }

  // ---------- 상호작용 ----------
  private async interact() {
    const L = this.lead;
    const near = (x: number, y: number, r: number) => Math.hypot(x - L.x, y - L.y) < r;
    const npc = this.npcs.filter(n => near(n.x, n.y, 46)).sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
    if (npc) return this.recruit(npc);
    const folk = this.folks.filter(n => near(n.x, n.y, 46)).sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
    if (folk) return this.region ? this.talkRegionFolk(folk.id) : this.talkFolk(folk.id);
    const pf = feetOf(this.pointSpot);
    if (near(pf.x, pf.y, 48)) {
      this.lock = true; this.pendingRest = false;
      await runDialogue('point_talk');
      if (this.pendingRest) await this.rest();
      this.lock = false; return;
    }
    const tf = feetOf(TOWER_SPOT);
    if (!this.region && Math.abs(L.x - (tf.x + 12)) < 44 && L.y > tf.y - 10 && L.y < tf.y + 50) return this.towerInteract();
    const fx = Math.floor((L.x + this.face.x * 20) / TILE), fy = Math.floor((L.y - 6 + this.face.y * 20) / TILE);
    if (this.grid[fy]?.[fx] === 'X') return this.rockHint();
    const sign = this.signs.find(s => Math.abs(s.x - fx) <= 1 && Math.abs(s.y - fy) <= 1 && near(s.x * TILE + 12, s.y * TILE + 12, 48));
    if (sign) return toast(sign.text);
    const ft = this.grid[fy]?.[fx];
    const nearS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.grid[Math.floor((L.y - 6) / TILE) + dy]?.[Math.floor(L.x / TILE) + dx] === 'S');
    if (ft === 'S' || nearS || (!this.region && Math.abs(L.x - (STATION_SPOT.x + 1) * TILE) < 40 && L.y > STATION_SPOT.y * TILE - 30)) return this.station();
    if (ft === 'V') return toast(GameState.inParty('haming') ? `시든 덩굴. 하밍의 개화라면 길을 틀 수 있을 것 같다. (${SWITCH_HINT(6)})` : '시든 덩굴이 길을 막고 있다.');
    if (ft === 'g') return toast(GameState.inParty('shiro') ? `좁은 틈. 시로라면 지나갈 수 있을 것 같다. (${SWITCH_HINT(9)})` : '고양이나 지나갈 법한 좁은 틈이다.');
    if (this.grid[fy]?.[fx] === 'f') return toast(GameState.inParty('haming') ? '꽃이 활짝 피었다.' : '시든 화단. 뿌리는 아직 살아 있는 것 같다.');
  }

  private async recruit(n: Npc) {
    this.lock = true;
    n.bubble.setVisible(false);
    const L0 = this.lead, ddx = L0.x - n.x, ddy = L0.y - n.y;
    const nd: Dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : (ddy < 0 ? 'up' : 'down');
    n.spr.setFrame(DIR_ROW[nd] * 4);
    await runDialogue(`recruit_${n.id}`);
    const d = GameState.data;
    d.party.push(n.id);
    this.npcs = this.npcs.filter(x => x !== n);
    n.spr.destroy(); n.shadow.destroy(); n.tag.destroy(); n.bubble.destroy();
    this.spawnActor(n.id, n.x, n.y);
    if (n.id === 'haming') this.refreshFlowers();
    Bus.emit('hud-refresh');
    const num = CHAR_IDS.indexOf(n.id) + 1;
    toast(`${charById(n.id).name} 합류! ${SWITCH_HINT(num)}으로 바꿀 수 있어.`);
    this.lock = false;
    if (d.party.length === 9 && !GameState.flag('mq.gather')) this.time.delayedCall(900, () => this.chapterEnd());
  }

  private rockHint() {
    const d = GameState.data;
    if (d.leader === 'dotcha') toast(isTouchDevice() ? '금 간 바위다. B(능력)로 돌진!' : '금 간 바위다. Q(능력)로 돌진!');
    else if (d.party.includes('dotcha')) toast(`금 간 바위다. 돗챠로 교체해서 부숴 보자. (${SWITCH_HINT(3)})`);
    else toast('금 간 바위다. 힘센 누군가가 있으면 부술 수 있을 것 같다.');
  }

  private async chapterEnd() {
    this.lock = true;
    const L = this.lead;
    this.cameras.main.stopFollow();
    this.cameras.main.pan(21 * TILE, 10 * TILE, 900, 'Sine.easeInOut');
    await new Promise(r => this.time.delayedCall(1000, r));
    await runDialogue('all_gathered');
    GameState.setFlag('mq.gather');
    GameState.data.flags['sq.unlocked'] = true;
    this.spawnPickups(); this.refreshFolkMarks();
    Bus.emit('hud-refresh');
    this.cameras.main.pan(L.x, L.y - 40, 600, 'Sine.easeInOut', false, (_c, p) => { if (p === 1) this.orderActors(); });
    this.lock = false;
  }

  // ---------- 1막 퀘스트 ----------
  private folkName(id: string) {
    if (id === 'piko') return '피코';
    if (id === 'grandma') return '빵집 할머니';
    const names: Record<string, string> = { nb_a: '모아', nb_b: '포실', nb_c: '뭉게' };
    return GameState.flag(`sq02.${id}`) ? names[id] : '구름 주민';
  }
  private refreshFolkMarks() {
    const f = (k: string) => !!GameState.flag(k);
    for (const v of this.folks) {
      let m = '';
      if (v.id === 'piko') m = !f('sq01.start') ? '!' : !f('sq01.done') && GameState.item('letters') >= 5 ? '?' : '';
      else if (v.id === 'grandma') m = !f('sq02.start') ? '!' : !f('sq02.done') && ['nb_a', 'nb_b', 'nb_c'].every(k => f(`sq02.${k}`)) ? '?' : '';
      else m = f('sq02.start') && !f(`sq02.${v.id}`) ? '?' : '';
      v.mark.setText(m).setVisible(!!m).setBackgroundColor(m === '!' ? '#ffd66b' : '#9fe0c4');
      v.tag.setText(this.folkName(v.id));
    }
  }
  private spawnPickups() {
    const d = GameState.data, have = new Set(this.pickups.map(p => p.id));
    const add = (id: string, kind: 'piece' | 'letter', s: { x: number; y: number }) => {
      if (have.has(id) || d.picked.includes(id)) return;
      const spr = this.add.image(s.x * TILE + 12, s.y * TILE + 12, kind === 'piece' ? 'starpiece' : 'letter').setDepth((s.y + 1) * TILE).setScale(1.3);
      this.tweens.add({ targets: spr, y: spr.y - 5, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (kind === 'piece') this.tweens.add({ targets: spr, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
      this.pickups.push({ id, kind, spr });
    };
    if (GameState.flag('mq.gather') && !GameState.flag('mq.cloud')) STAR_PIECES.forEach((s, i) => add(`piece_${i}`, 'piece', s));
    if (GameState.flag('sq01.start') && !GameState.flag('sq01.done')) LETTERS.forEach((s, i) => add(`letter_${i}`, 'letter', s));
  }
  private async talkFolk(id: string) {
    const f = (k: string) => !!GameState.flag(k);
    this.lock = true;
    if (!f('mq.gather')) { await runDialogue('folk_idle'); this.lock = false; return; }
    if (id === 'piko') {
      if (!f('sq01.start')) { await runDialogue('piko_start'); GameState.setFlag('sq01.start'); this.spawnPickups(); }
      else if (!f('sq01.done') && GameState.item('letters') >= 5) {
        await runDialogue('piko_done'); GameState.setFlag('sq01.done'); GameState.data.inventory.letters = 0;
        GameState.addItem('starShard', 30); Audio.sfx('get'); GameState.spend(1, '편지 배달');
      } else toast(f('sq01.done') ? '피코: 오늘도 열심히 배달 중!' : `피코: 편지가 ${GameState.item('letters')}/5통 모였어요. 언덕 위도 봐 주세요!`);
    } else if (id === 'grandma') {
      const met = ['nb_a', 'nb_b', 'nb_c'].every(k => f(`sq02.${k}`));
      if (!f('sq02.start')) await runDialogue('grandma_start'), GameState.setFlag('sq02.start');
      else if (!f('sq02.done') && met) {
        await runDialogue('grandma_done'); GameState.setFlag('sq02.done');
        GameState.data.bugNotes.push(SQ02_NOTE.id); toast(SQ02_NOTE.text); Audio.sfx('get'); GameState.spend(1, '이웃 찾기');
      } else toast(f('sq02.done') ? '빵집 할머니: 오늘 빵은 갓 구웠단다.' : '빵집 할머니: 이웃들 이름은 들어 봤니?');
    } else {
      if (f('sq02.start') && !f(`sq02.${id}`)) { await runDialogue(`${id}_name`); GameState.setFlag(`sq02.${id}`); Audio.sfx('get'); }
      else if (f(`sq02.${id}`)) toast(`${this.folkName(id)}: 이름 불러 줘서 고마워요!`);
      else await runDialogue('folk_idle');
    }
    this.refreshFolkMarks(); Bus.emit('hud-refresh');
    this.lock = false;
  }
  private async towerInteract() {
    if (!GameState.flag('mq.gather')) return toast('시계탑. 바늘이 72에서 멈춰 있다.');
    if (GameState.flag('mq.cloud')) return toast('시계탑 꼭대기에서 별이 조용히 빛나고 있다.');
    const n = GameState.item('towerPieces');
    if (n < 3) return toast(`무너진 시계탑. 별 조각이 모자라. (${n}/3)`);
    this.lock = true;
    await runDialogue('tower_restore');
    this.lock = false;
  }
  private restoreTower() {
    const t = this.tower;
    t.setVisible(true).setCrop(0, t.height, t.width, 0);
    let h = 0;
    this.time.addEvent({ delay: 30, repeat: 30, callback: () => { h += 4; t.setCrop(0, Math.max(0, t.height - h), t.width, h); } });
    this.time.delayedCall(1100, () => { t.setCrop(); this.lightSkyStar(true); });
    this.cameras.main.flash(500, 255, 240, 180);
    Audio.sfx('star');
  }
  private lightSkyStar(anim: boolean) {
    if (this.skyStar) return;
    this.skyStar = this.add.image(820, 40, 'skystar').setScrollFactor(0).setDepth(-18).setScale(2);
    this.tweens.add({ targets: this.skyStar, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    if (anim) this.tweens.add({ targets: this.skyStar, scale: { from: 6, to: 2 }, duration: 800, ease: 'Back.out' });
  }
  private station() {
    const d = GameState.data;
    if (!this.region && !GameState.flag('mq.cloud') && !this.preview) return toast('하늘 정류장. 하늘길이 끊겨 있어 아직 출발할 수 없다.');
    const visited = (id: string) => !!GameState.flag(`visit.${id}`);
    const avail = (id: string, act: number): string | null => {
      if (this.preview) return null;
      if (id === 'studio') return '현실로는 아직 돌아갈 수 없다';
      if (id === 'cloud') return null;
      if (act === 2 && (id === 'mirror' || id === 'park')) return GameState.flag('mq.cloud') ? null : '1막을 끝내야 열린다';
      if (id === 'data') return visited('mirror') && visited('park') ? null : '거울의 숲과 놀이공원을 먼저 둘러보자';
      return `${act === 5 ? '시크릿' : act + '막'} · 이야기 준비 중`;
    };
    const opts = MAP_ORDER.filter(m => m.id !== this.mapId).map(m => {
      const lock = avail(m.id, m.act);
      return { label: `${m.name}${lock ? ' 🔒' : ''}`, act: () => lock ? toast(lock) : this.travel(m.id) };
    });
    opts.push({ label: '닫기', act: () => {} });
    Bus.emit('menu', this.preview ? '맵 둘러보기 — 어디로 갈까?' : '하늘 정류장 — 어디로 갈까?', opts, this.preview ? '둘러보기 모드: 시간이 흐르지 않고 저장되지 않아요.' : '이동할 때마다 2시간이 흐른다.');
  }
  private travel(id: string) {
    const d = GameState.data;
    this.lock = true;
    if (!this.preview) GameState.spend(2, '이동');
    d.pos = { x: 0, y: 0 };
    this.cameras.main.fadeOut(400, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ from: 'travel', map: id }));
  }
  private async talkRegionFolk(id: string) {
    const f = this.regionFolks.find(x => x.id === id); if (!f) return;
    this.lock = true;
    await new Promise<void>(res => Bus.emit('lines', f.lines.map(t => ({ name: f.name, por: `folk_${id}`, text: t })), res));
    this.lock = false;
  }

  private async rest() {
    const d = GameState.data;
    const scenes: [string, string[]][] = [['rest_1', ['rumung', 'haming']], ['rest_2', ['dotcha', 'ttuning']], ['rest_3', ['darae', 'eune']], ['rest_4', ['dodamhi', 'shiro']], ['rest_5', ['bigwin']]];
    const pick = scenes.find(([k, who]) => !GameState.flag(`rest.${k}`) && who.every(w => d.party.includes(w as CharId)));
    this.cameras.main.fadeOut(500, 8, 6, 24);
    await new Promise(r => this.time.delayedCall(600, r));
    GameState.spend(6, '휴식');
    if (pick) {
      this.cameras.main.fadeIn(400, 8, 6, 24);
      await runDialogue(pick[0]);
      GameState.setFlag(`rest.${pick[0]}`);
      pick[1].forEach(w => GameState.addBond(w));
    } else { this.cameras.main.fadeIn(400, 8, 6, 24); toast('푹 쉬었다.'); }
  }
  private async timeUp() {
    if (this.lock && GameState.flag('time.up')) return;
    GameState.setFlag('time.up'); this.lock = true;
    // 진행 중인 대화가 끝나면 엔딩으로
    while (UIState.busy) await new Promise(r => this.time.delayedCall(200, r));
    await new Promise(r => this.time.delayedCall(800, r));
    Audio.bgm(null);
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', async () => {
      await SaveManager.clear();
      this.scene.start('Ending', { kind: 'reset' });
    });
  }
  private openMainMenu() {
    Bus.emit('menu', '일시정지', [
      { label: '계속하기', act: () => {} },
      { label: '퀘스트 (J)', act: () => this.showQuests() },
      { label: '가방 (I)', act: () => this.showBag() },
      { label: Audio.muted ? '소리 켜기' : '소리 끄기', act: () => { Audio.setMuted(!Audio.muted); toast(Audio.muted ? '소리를 껐어요.' : '소리를 켰어요.'); } },
      { label: '저장은 포인트(★)에게', act: () => toast('광장의 별, 포인트에게 말을 걸면 저장할 수 있어.') },
      { label: '타이틀로', act: () => this.scene.start('Title') },
    ]);
  }
  private showQuests() {
    const q = questLog();
    const body = q.map(x => `${x.done ? '✔' : '▸'} [${x.kind}] ${x.title}\n   ${x.desc}`).join('\n\n') || '진행 중인 퀘스트가 없다.';
    Bus.emit('menu', '퀘스트', [{ label: '닫기', act: () => {} }], body);
  }
  private showBag() {
    const d = GameState.data;
    const lines = Object.entries(d.inventory).filter(([, n]) => n > 0).map(([k, n]) => `${ITEM_NAMES[k]?.name ?? k} ×${n}\n   ${ITEM_NAMES[k]?.desc ?? ''}`);
    lines.push(`버그 노트 ${d.bugNotes.length}/3`, `세계 기억 ${d.memories.world}/8`);
    Bus.emit('menu', '가방', [{ label: '닫기', act: () => {} }], lines.join('\n'));
  }

  private onTag(t: string) {
    if (t === 'glitch') {
      glitchBurst(this); Audio.sfx('glitch');
      if (GameState.data.party.length === 9 && !GameState.flag('mq.gather')) {
        this.glitchCount++;
        if (this.glitchCount === 1) this.eraseTower();
        if (this.glitchCount === 2) this.cronFlash();
      }
    }
    if (t === 'rest') this.pendingRest = true;
    if (t === 'quest') { Audio.sfx('quest'); Bus.emit('hud-refresh'); }
    if (t === 'tower_light') this.restoreTower();
    if (t === 'act_clear') this.time.delayedCall(50, () => this.actClear());
    if (t === 'save' && this.preview) { toast('둘러보기 모드에서는 저장하지 않아요.'); return; }
    if (t === 'save') {
      this.storePos();
      GameState.save().then(ok => { if (ok) Audio.sfx('save'); toast(ok ? '저장했어요. (이 기기 브라우저)' : '저장에 실패했어요. 브라우저 저장소 설정을 확인해 주세요.'); });
    }
  }
  private actClear() {
    const d = GameState.data;
    GameState.setFlag('mq.cloud'); d.memories.world = Math.max(d.memories.world, 1); d.inventory.towerPieces = 0;
    GameState.spend(2, '시계탑 복구');
    Bus.emit('hud-refresh');
    // 대화가 끝난 뒤 완료 메뉴
    const wait = () => { if ((this.scene.get('UI') as any).sys && !(UIState.busy)) open(); else this.time.delayedCall(200, wait); };
    const open = () => Bus.emit('menu', '1막 완료 — 구름 위의 마을', [
      { label: '마을 더 둘러보기', act: () => toast('서브 퀘스트를 마저 하거나, 남쪽 하늘 정류장을 확인해 봐.') },
      { label: '저장하고 타이틀로', act: async () => { this.storePos(); await GameState.save(); this.scene.start('Title'); } },
    ], '세계 기억 1/8 · 남은 시간 ' + Math.floor(d.hoursLeft) + '시간');
    this.time.delayedCall(400, wait);
  }
  private storePos() { GameState.data.pos = { x: Math.round(this.lead.x), y: Math.round(this.lead.y) }; }

  private eraseTower() {
    const t = this.tower;
    for (let i = 0; i < 160; i++) {
      const px = t.x - 24 + Phaser.Math.Between(0, 11) * 4, py = t.y - Phaser.Math.Between(0, 29) * 4;
      const b = this.add.image(px, py, 'blackpx').setDepth(t.depth + 1).setAlpha(0);
      this.tweens.add({ targets: b, alpha: 1, delay: (t.y - py) * 6, duration: 80 });
      this.tweens.add({ targets: b, alpha: 0, delay: 1400 + Phaser.Math.Between(0, 400), duration: 200, onComplete: () => b.destroy() });
    }
    this.time.delayedCall(1200, () => t.setVisible(false));
  }
  private cronFlash() {
    const x = 21 * TILE, y = 12 * TILE;
    const body = this.add.rectangle(x, y - 34, 26, 60, 0x0b0820).setDepth(9000);
    const head = this.add.rectangle(x, y - 74, 22, 22, 0x0b0820).setDepth(9000);
    [body, head].forEach(o => this.tweens.add({ targets: o, alpha: { from: 0, to: 1 }, duration: 80, yoyo: true, repeat: 5, onComplete: () => o.destroy() }));
  }

  // ---------- 능력 ----------
  private useAbility() {
    if (this.abilityCd > 0) return;
    this.abilityCd = 0.4;
    const L = this.lead, id = GameState.data.leader;
    const tx = Math.floor(L.x / TILE), ty = Math.floor((L.y - 4) / TILE);
    if (id === 'rumung') return this.cloudStep(tx, ty);
    if (id === 'dotcha') return this.dash(tx, ty);
    if (id === 'haming') return this.bloom(tx, ty);
    if (id === 'shiro') { toast('시로는 고양이 길(좁은 틈)을 그냥 지나갈 수 있어.'); return; }
    const c = charById(id);
    toast(`${c.name}의 「${c.ability}」은 다음 지역부터 쓸 수 있어.`);
  }

  private cloudStep(tx: number, ty: number) {
    const { x: dx, y: dy } = this.face;
    const voids: [number, number][] = [];
    let landed = false;
    for (let k = 1; k <= 6; k++) {
      const x = tx + dx * k, y = ty + dy * k;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) break;
      const t = this.grid[y][x];
      if (t === ' ' && !this.bridges.has(key(x, y))) { voids.push([x, y]); continue; }
      if (!voids.length) { toast('구름을 띄울 빈 하늘이 없어. 하늘 끝을 바라보고 써 봐.'); return; }
      landed = !this.blocked(t) || this.bridges.has(key(x, y));
      break;
    }
    if (!voids.length) { toast('구름을 띄울 빈 하늘이 없어. 하늘 끝을 바라보고 써 봐.'); return; }
    if (!landed || voids.length > 4) { toast('건너편이 너무 멀어.'); return; }
    voids.forEach(([x, y], i) => {
      const img = this.add.image(x * TILE, y * TILE, 'cloudstep').setOrigin(0).setDepth(-5).setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: img, scale: 1, alpha: 1, delay: i * 90, duration: 220, ease: 'Back.out' });
      this.bridges.set(key(x, y), img);
    });
    toast('구름 걸음! 잠시 동안 건널 수 있어.'); Audio.sfx('cloud');
    const keys = voids.map(([x, y]) => key(x, y));
    const expire = () => {
      const L = this.lead; const lk = key(Math.floor(L.x / TILE), Math.floor((L.y - 4) / TILE));
      if (keys.includes(lk)) { this.time.delayedCall(1000, expire); return; }
      keys.forEach(k => { const img = this.bridges.get(k); if (!img) return; this.bridges.delete(k); this.tweens.add({ targets: img, alpha: 0, scale: 0.6, duration: 300, onComplete: () => img.destroy() }); });
    };
    this.time.delayedCall(12000, expire);
  }

  private bloom(tx: number, ty: number) {
    const { x: dx, y: dy } = this.face;
    let hit: [number, number] | null = null;
    for (let k = 1; k <= 2 && !hit; k++) { const x = tx + dx * k, y = ty + dy * k; if (this.grid[y]?.[x] === 'V') hit = [x, y]; }
    if (!hit) { toast('피워 낼 덩굴이 없어.'); return; }
    const [x, y] = hit; const k = key(x, y);
    this.grid[y][x] = ','; GameState.setFlag(`bloom:${this.mapId}:${k}`);
    const v = this.vines.get(k); this.vines.delete(k);
    if (v) this.tweens.add({ targets: v, alpha: 0, duration: 400, onComplete: () => v.destroy() });
    const fl = this.add.image(x * TILE, y * TILE, 'bloom_yellow').setOrigin(0).setDepth((y + 1) * TILE).setScale(1, 0);
    this.tweens.add({ targets: fl, scaleY: 1, duration: 400, ease: 'Back.out' });
    Audio.sfx('star'); toast('개화! 덩굴이 꽃길로 바뀌었다.');
  }
  private dash(tx: number, ty: number) {
    const { x: dx, y: dy } = this.face;
    let hit: [number, number] | null = null;
    for (let k = 1; k <= 2 && !hit; k++) {
      const x = tx + dx * k, y = ty + dy * k;
      if (this.grid[y]?.[x] === 'X') hit = [x, y];
      else if (this.grid[y]?.[x] && this.blocked(this.grid[y][x])) break;
    }
    const L = this.lead;
    this.tweens.add({ targets: L, x: L.x + dx * 10, y: L.y + dy * 10, duration: 90, yoyo: true });
    if (!hit) { toast('부술 수 있는 게 없어.'); return; }
    // 붙어 있는 바위를 모두 부순다
    const stack = [hit], seen = new Set<string>();
    while (stack.length) {
      const [x, y] = stack.pop()!; const k = key(x, y);
      if (seen.has(k) || this.grid[y]?.[x] !== 'X') continue;
      seen.add(k); stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    this.cameras.main.shake(200, 0.01); Audio.sfx('dash');
    seen.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      this.grid[y][x] = '=';
      GameState.data.brokenRocks.push(this.region ? `${this.mapId}:${k}` : k);
      const r = this.rocks.get(k); this.rocks.delete(k);
      if (r) this.tweens.add({ targets: r, alpha: 0, scale: 1.3, duration: 200, onComplete: () => r.destroy() });
      for (let i = 0; i < 12; i++) {
        const p = this.add.image(x * TILE + 12, y * TILE + 12, 'pixel').setTint(0x9c93b8).setScale(2).setDepth(9500);
        this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-30, 30), y: p.y + Phaser.Math.Between(-30, 20), alpha: 0, duration: 450, onComplete: () => p.destroy() });
      }
    });
    toast('돌진! 바위가 부서졌다.');
  }

  // ---------- 루프 ----------
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.sky.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.far.tilePositionX += dt * 6;
    this.abilityCd = Math.max(0, this.abilityCd - dt);

    const busy = UIState.busy || this.lock;
    const L = this.lead;
    let moving = false;
    if (!busy) {
      if (Input.take('menu')) this.openMainMenu();
      if (Input.take('quest')) this.showQuests();
      if (Input.take('bag')) this.showBag();
      for (let n = 1; n <= 9; n++) if (Input.take(`num${n}` as any)) this.switchTo(CHAR_IDS[n - 1]);
      if (Input.take('switch')) this.cycle();
      if (Input.take('ability')) this.useAbility();
      if (Input.take('confirm')) this.interact();

      const ax = Input.axis();
      if (ax.x || ax.y) {
        moving = true;
        const sp = Input.running() ? RUN : SPEED;
        const nx = L.x + ax.x * sp * dt, ny = L.y + ax.y * sp * dt;
        if (this.boxFree(nx, L.y)) L.x = nx;
        if (this.boxFree(L.x, ny)) L.y = ny;
        if (Math.abs(ax.x) > Math.abs(ax.y)) { this.face = { x: Math.sign(ax.x), y: 0 }; L.dir = ax.x < 0 ? 'left' : 'right'; }
        else { this.face = { x: 0, y: Math.sign(ax.y) }; L.dir = ax.y < 0 ? 'up' : 'down'; }
        L.walk += dt * (Input.running() ? 16 : 11);
        const last = this.hist[this.hist.length - 1];
        if (Math.hypot(last.x - L.x, last.y - L.y) > 1) { this.hist.push({ x: L.x, y: L.y, flip: L.flip }); if (this.hist.length > 400) this.hist.shift(); }
      }
    }
    this.place(L, moving, true);
    this.followers().forEach((f, i) => {
      const h = this.hist[Math.max(0, this.hist.length - 1 - (i + 1) * FOLLOW_GAP)];
      const before = { x: f.x, y: f.y };
      const k = Math.min(1, dt * 10);
      f.x += (h.x - f.x) * k; f.y += (h.y - f.y) * k;
      const mv = Math.hypot(f.x - before.x, f.y - before.y) > 0.3;
      if (mv) {
        f.walk += dt * 11;
        const mx = f.x - before.x, my = f.y - before.y;
        f.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down');
      }
      this.place(f, mv);
    });

    // 버그 노트 줍기
    for (const n of [...this.notes]) if (Math.hypot(n.spr.x - L.x, n.spr.y - (L.y - 8)) < 22) {
      GameState.data.bugNotes.push(n.id); n.spr.destroy(); this.notes = this.notes.filter(x => x !== n);
      toast(n.text); Bus.emit('hud-refresh');
    }
    for (const p of [...this.pickups]) if (Math.hypot(p.spr.x - L.x, p.spr.y - (L.y - 8)) < 22) {
      GameState.data.picked.push(p.id); p.spr.destroy(); this.pickups = this.pickups.filter(x => x !== p);
      Audio.sfx('get');
      if (p.kind === 'piece') { GameState.addItem('towerPieces'); const n = GameState.item('towerPieces'); toast(n >= 3 ? '시계탑 별 조각을 모두 모았다! 무너진 시계탑으로 가자.' : `시계탑 별 조각을 주웠다. (${n}/3)`); }
      else { GameState.addItem('letters'); const n = GameState.item('letters'); toast(n >= 5 ? '편지를 다 모았다! 피코에게 돌아가자.' : `날아간 편지를 주웠다. (${n}/5)`); }
      this.refreshFolkMarks();
    }
    // 동쪽 섬 힌트 (한 번)
    if (!GameState.flag('hint.island') && Math.floor(L.x / TILE) >= 31 && L.y > 11 * TILE && L.y < 17 * TILE) {
      GameState.setFlag('hint.island');
      toast(GameState.inParty('rumung') ? '건너편 섬에 누가 보인다. 루뭉의 구름 걸음이라면…' : '건너편 섬에 누가 보인다. 하늘 위를 걸을 방법이 있다면…');
    }
    // 근처 대상 강조
    const nearN = this.npcs.find(n => Math.hypot(n.x - L.x, n.y - L.y) < 46);
    this.npcs.forEach(n => n.bubble.setScale(n === nearN ? 1.25 : 1));
  }

  private place(a: Actor, moving: boolean, isLead = false) {
    const bob = 0;
    a.spr.setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y + (isLead ? 0.5 : 0));
    const key = `${a.id}-${a.dir}`;
    if (moving) { if (a.spr.anims.currentAnim?.key !== key || !a.spr.anims.isPlaying) a.spr.play(key, true); }
    else { a.spr.anims.stop(); a.spr.setFrame(DIR_ROW[a.dir] * 4); }
    a.tag.setVisible(isLead);
    a.shadow.setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y - 1).setScale(moving ? 1 - bob * 0.04 : 1, 1);
    a.tag.setPosition(Math.round(a.x), Math.round(a.y + 2)).setDepth(a.y);
  }
}
