// 필드 씬: 구름 위의 마을 (1막)
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { Bus, GameState } from '../systems/GameState';
import { Story1 } from '../systems/StoryRunner';
import { CHAR_IDS, charById, WALK, DIR_ROW, type CharId, type Dir } from '../data/characters';
import {
  TILE, COLS, ROWS, buildGrid, MEMBER_SPOTS, POINT_SPOT, START_SPOT, BUG_NOTES, SIGNS,
  STAR_PIECES, LETTERS, VILLAGERS, TOWER_SPOT, SQ02_NOTE, HINT_SPOT, TOWER_VEIL,
} from '../world/cloudVillage';
import { makeFolk, makeQuestProps } from '../gfx/paint';
import { questLog, ITEM_NAMES } from '../data/quests';
import { Audio } from '../systems/AudioManager';
import { regionById, MAP_ORDER, BLOCK, MAP_IMG, MAP_FG, type RegionMap } from '../world/maps';
import { SaveManager } from '../systems/SaveManager';
import { runDialogue, toast, UIState, FONT } from './UIScene';
import { glitchBurst } from './PrologueScene';
import { isTouchDevice } from '../ui/TouchPad';
import { showReport } from '../ui/ReportPanel';
import { Cloud } from '../systems/Cloud';
import { SCRIPTS, EPISODES, episodeOpen, SHOP, type Episode } from '../world/content';
import type { Ctx, Thing, Anchor, RegionScript } from '../world/script';
import { Layout, type Pt } from '../world/layout';
import { makeThingTextures } from '../gfx/things';
import { ambient } from '../gfx/ambient';
import { runPuzzle, type PuzzleCfg } from './PuzzleScene';
import { FOLK_KIND, folkTexture } from '../data/folks';
import { regionName, countNotes, NOTE_TOTAL } from '../data/quests';
import { cloudPos, CLOUD_FG } from '../world/cloudVillage';

interface ThingInst { def: Thing; spr: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text; x: number; y: number; key: string; tile: Pt }
/** 지역 메인 퀘스트를 주는 주민 (길 안내에서 먼저 가리킨다) */
const MAIN_FOLK: Record<string, string> = { mirror: 'spirit', park: 'clerk', data: 'b07', garden: 'lyle', station: 'master', photo: 'photographer', shadow: 'cat', trash: 'cron' };
/** 지역에 들어설 때 보여 주는 한 줄 목표 */
const REGION_GOAL: Record<string, string> = {
  cloud: '흩어진 친구들을 찾고, 시계탑의 별을 다시 켜자', mirror: '거울에 비치지 않는 우리 — 거울의 기억을 읽자',
  park: '개장 1분 전에 멈춘 놀이공원을 다시 돌리자', data: '세계를 지우는 정리 프로그램의 흔적을 쫓자',
  garden: '피지 못한 달꽃을 피우자', station: '이름이 지워진 종착역까지 선로를 잇자',
  photo: '사람이 찍히지 않는 사진의 비밀을 풀자', shadow: '크론을 피해 포인트의 정체를 밝히자',
  lastsave: '마지막으로 무엇을 저장할지 정하자', trash: '지워진 것들이 모이는 곳',
};
/** 필드 오브젝트 텍스처 → 아이템 그림 */
const THING_ITEM: Record<string, string> = { page: 'page', shard: 'shard', balloon: 'balloon', file: 'file', lost: 'lost', frame: 'mat', kitten: 'kitten', record: 'record' };
const MQ_OF: Record<string, string> = { cloud: 'mq.cloud', mirror: 'mq.mirror', park: 'mq.park', data: 'mq.datacenter', garden: 'mq.garden', station: 'mq.station', photo: 'mq.photo', shadow: 'mq.shadow', lastsave: 'mq.final' };
const WORLD_MQ = ['mq.mirror', 'mq.park', 'mq.datacenter', 'mq.garden', 'mq.station', 'mq.photo', 'mq.shadow'];

const t2s = (l?: string | (() => string)) => (typeof l === 'function' ? l() : l) ?? '';
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
  private signs: { x: number; y: number; text: string; key?: string }[] = SIGNS;
  private vines = new Map<string, Phaser.GameObjects.Image>();
  private preview = false;
  private bridges = new Map<string, Phaser.GameObjects.Image>();
  private rocks = new Map<string, Phaser.GameObjects.Image>();
  private actors = new Map<CharId, Actor>();
  private npcs: Npc[] = [];
  private point!: Phaser.GameObjects.Image;
  private pointBubble!: Phaser.GameObjects.Text;
  private notes: { id: string; spr: Phaser.GameObjects.Image; text: string }[] = [];
  private tower!: Phaser.GameObjects.Container;
  private flowers: Phaser.GameObjects.Image[] = [];
  private hist: { x: number; y: number; flip: boolean }[] = [];
  private face = { x: 0, y: 1 };
  private abilityCd = 0;
  private glitchCount = 0;
  private lock = false;
  private folks: { id: string; spr: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private pickups: { id: string; kind: 'piece' | 'letter'; spr: Phaser.GameObjects.Image }[] = [];
  private pendingRest = false;
  private skyStar?: Phaser.GameObjects.Image;
  private script?: RegionScript;
  private layout!: Layout;
  private things: ThingInst[] = [];
  private mirrored = false;
  private boost = 0;
  private raceState: { flags: string[]; next: number; t: number; onWin: (c: Ctx) => void | Promise<void> } | null = null;
  private chaseState: { cron: Phaser.GameObjects.Sprite; x: number; y: number; start: Pt; goal: Pt; lamps: string[]; stun: number; delay: number; field: Int32Array | null; fieldT: number; onWin: (c: Ctx) => void | Promise<void> } | null = null;
  private modeText!: Phaser.GameObjects.Text;
  private darkImg?: Phaser.GameObjects.Image;
  private mapOverlay?: Phaser.GameObjects.Container;

  constructor() { super('World'); }

  private live = false;
  create(data: { from: 'new' | 'load' | 'travel'; map?: string }) {
    const d = GameState.data;
    this.live = false;
    {
      const id = data.map ?? (d.flags.map as string) ?? 'cloud';
      const url = MAP_IMG[`../assets/maps/${id}.webp`], fgUrl = MAP_FG[`../assets/maps/${id}_fg.png`];
      if ((url && !this.textures.exists(`mapimg_${id}`)) || (fgUrl && !this.textures.exists(`mapfg_${id}`))) {
        this.cameras.main.setBackgroundColor('#0c0920');
        const t = this.add.text(480, 270, '불러오는 중…', { fontFamily: FONT, fontSize: '24px', color: '#c9c0ef' }).setOrigin(0.5).setScrollFactor(0);
        if (url && !this.textures.exists(`mapimg_${id}`)) this.load.image(`mapimg_${id}`, url);
        if (fgUrl && !this.textures.exists(`mapfg_${id}`)) this.load.image(`mapfg_${id}`, fgUrl);
        this.load.once('complete', () => { t.destroy(); this.scene.restart(data); });
        this.load.start();
        return;
      }
    }
    this.mapId = data.map ?? (d.flags.map as string) ?? 'cloud';
    d.flags.map = this.mapId;
    this.preview = !!d.flags.preview;
    this.region = regionById(this.mapId);
    if (this.region) { this.grid = this.region.grid.map(r => [...r]); this.cols = this.region.cols; this.rows = this.region.rows; this.pointSpot = this.region.point ?? POINT_SPOT; this.signs = this.region.signs; }
    else { this.grid = buildGrid(); this.cols = COLS; this.rows = ROWS; this.pointSpot = POINT_SPOT; this.signs = SIGNS; }
    for (const k of d.brokenRocks) {
      const [m, xy] = k.includes(':') ? k.split(':') : ['cloud', k];
      if (m !== this.mapId) continue;
      const [x, y] = xy.split(',').map(Number); this.grid[y][x] = '=';
    }
    for (const k of Object.keys(d.flags)) if (k.startsWith(`bloom:${this.mapId}:`)) { const [x, y] = k.split(':')[2].split(',').map(Number); this.grid[y][x] = ','; }
    this.vines.clear();
    GameState.setFlag(`visit.${this.mapId}`);
    this.bridges.clear(); this.rocks.clear(); this.actors.clear(); this.npcs = []; this.notes = []; this.flowers = []; this.hist = []; this.glitchCount = 0; this.lock = false; this.folks = []; this.pickups = []; this.pendingRest = false; this.skyStar = undefined; this.guideG = undefined; this.guidePath = []; this.guideNeed = null; this.guideT = 0;

    const img = this.region ? this.region.image : MAP_IMG['../assets/maps/cloud.webp'];
    const texKey = `mapimg_${this.mapId}`;
    this.cameras.main.setBackgroundColor('#0c0920');
    if (img && this.textures.exists(texKey)) this.add.image(0, 0, texKey).setOrigin(0).setDepth(-10);
    // 가림 조각: 캐릭터 발이 밑동보다 뒤(위쪽)에 있으면 이 조각이 캐릭터를 덮는다
    const fgKey = `mapfg_${this.mapId}`;
    if (this.textures.exists(fgKey)) {
      const tex = this.textures.get(fgKey);
      (this.region ? this.region.fg : CLOUD_FG).forEach(([x, y, w, h, base, ax, ay], i) => {
        const fr = `p${i}`; if (!tex.has(fr)) tex.add(fr, 0, ax, ay, w, h);
        this.add.image(x, y, fgKey, fr).setOrigin(0).setDepth(base - 2);
      });
    }
    this.markSpecialTiles();
    // 바위 · 덩굴
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      if (this.grid[y][x] === 'X') this.rocks.set(key(x, y), this.add.image(x * TILE + 12, (y + 1) * TILE + 2, this.textures.exists('deco_rock') ? 'deco_rock' : 'rock').setOrigin(0.5, 1).setDisplaySize(34, 30).setDepth((y + 1) * TILE));
      if (this.grid[y][x] === 'V') this.vines.set(key(x, y), this.add.image(x * TILE, y * TILE, 'vine').setOrigin(0).setDepth((y + 1) * TILE));
    }
    this.script = SCRIPTS[this.mapId];
    makeThingTextures(this);
    makeFolk(this, 'folk_cron', '#3d4793', 'cron');
    if (this.script?.signText) this.signs = this.signs.map(sg => sg.key && this.script!.signText![sg.key] ? { ...sg, text: this.script!.signText![sg.key] } : sg);
    if (this.region) this.buildRegionExtras();
    else this.buildCloudExtras(d);
    this.things = []; this.raceState = null; this.chaseState = null; this.mapOverlay = undefined; this.darkImg = undefined;
    this.mirrored = !!GameState.flag('mode.mirror') && this.mapId === 'mirror';
    GameState.setFlag('mode.race', false); GameState.setFlag('mode.chase', false);
    this.buildThings(this.region ? this.region.spawn : START_SPOT);
    this.errorOverlay();
    this.modeText = this.add.text(480, 92, '', { fontFamily: FONT, fontSize: '24px', color: '#ffd66b', backgroundColor: '#1a1438dd', padding: { x: 10, y: 4 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9800).setVisible(false);
    if (this.script?.dark) this.makeDark();
    this.live = true;
    // 포인트
    const pf = feetOf(this.pointSpot);
    const npcPt = this.textures.exists('npc_point');
    this.point = this.add.image(pf.x, npcPt ? pf.y - 6 : pf.y - 20, npcPt ? 'npc_point' : 'point').setOrigin(0.5, npcPt ? 1 : 0.5).setScale(npcPt ? 1.25 : 1.4).setDepth(pf.y);
    this.tweens.add({ targets: this.point, y: this.point.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pointBubble = this.add.text(pf.x, pf.y - (npcPt ? 96 : 64), '★', { fontFamily: FONT, fontSize: '24px', color: '#ffe27a' }).setOrigin(0.5).setDepth(9000);
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
    if (data.from === 'travel' || data.from === 'load') {
      Bus.emit('wipe', 'in');
      const m = MAP_ORDER.find(x => x.id === this.mapId);
      const kicker = m ? (m.act === 0 ? '프롤로그' : m.act === 5 ? '시크릿' : `${m.act}막`) : '';
      this.time.delayedCall(350, () => { Bus.emit('title-card', this.preview ? `${kicker} · 둘러보기` : kicker, m?.name ?? '', this.preview ? '' : GameState.flag(MQ_OF[this.mapId] ?? '-') ? '이 지역의 별은 이미 켜져 있다' : (REGION_GOAL[this.mapId] ?? '')); Audio.sfx('arrive'); });
    } else this.cameras.main.fadeIn(500, 255, 255, 255);

    if (!this.preview || this.mapId !== 'studio') ambient(this, this.mapId);
    Bus.emit('hud', true);
    const onTag = (t: string) => this.onTag(t);
    const onSpent = (h: number, why: string) => toast(`⏳ ${why} · ${h}시간 흘렀다`);
    const onUp = () => this.timeUp();
    Bus.on('tag', onTag); Bus.on('time-spent', onSpent); Bus.on('time-up', onUp);
    this.events.once('shutdown', () => { Bus.off('tag', onTag); Bus.off('time-spent', onSpent); Bus.off('time-up', onUp); Bus.emit('hud', false); Bus.emit('ui-reset'); });
    Audio.bgm(this.region ? this.region.bgm : 'village');

    if (data.from === 'new') this.time.delayedCall(700, async () => { await runDialogue('arrive'); this.time.delayedCall(300, () => this.howTo()); });
    else if (data.from === 'travel') this.time.delayedCall(400, () => {
      const arrive = this.script?.arrive;
      const secret = this.mapId === 'trash' && GameState.flag('secret.mode');
      if (arrive && !this.preview && (secret || !GameState.flag(`arrive.${this.mapId}`))) {
        GameState.setFlag(`arrive.${this.mapId}`);
        this.time.delayedCall(500, () => this.runAct(arrive));
      }
    });
    else this.time.delayedCall(2600, () => toast('이어서 시작해요.'));
  }

  /** 시계탑(그림 속 성)을 덮는 검은 픽셀 가림막 */
  private makeTowerVeil() {
    const [x0, y0, x1, y1] = TOWER_VEIL;
    const c = this.add.container(0, 0).setDepth(y1 + 1);
    const g = this.add.graphics();
    const cell = 12;
    for (let y = y0; y < y1; y += cell) for (let x = x0; x < x1; x += cell) {
      const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      const r = Math.random();
      if (edge < 30 && r < 0.45) continue;
      g.fillStyle(r < 0.08 ? 0xff5c7a : r < 0.16 ? 0x7cf0c8 : r < 0.6 ? 0x0b0820 : 0x1a1438, edge < 30 ? 0.75 : 0.96).fillRect(x, y, cell, cell);
    }
    c.add(g);
    this.tweens.add({ targets: g, alpha: 0.86, duration: 260, yoyo: true, repeat: -1 });
    return c;
  }
  /** 그림 맵 위 특수 칸 표시: 고양이 창살 · 정류장 */
  private markSpecialTiles() {
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const t = this.grid[y][x];
      if (t === 'g') {
        const g = this.add.graphics().setDepth((y + 1) * TILE - 1);
        g.fillStyle(0x0b0820, 0.55).fillRect(x * TILE, y * TILE, TILE, TILE);
        g.fillStyle(0x9d93c7, 0.9); for (let i = 3; i < TILE; i += 6) g.fillRect(x * TILE + i, y * TILE, 2, TILE);
      }
      if (t === 'S' && this.grid[y][x - 1] !== 'S' && this.grid[y - 1]?.[x] !== 'S') {
        let w = 1, h = 1; while (this.grid[y][x + w] === 'S') w++; while (this.grid[y + h]?.[x] === 'S') h++;
        const cx = (x + w / 2) * TILE, cy = (y + h / 2) * TILE;
        const ring = this.add.ellipse(cx, cy, w * TILE + 8, h * TILE * 0.7 + 8).setStrokeStyle(3, 0xffe27a, 0.95).setFillStyle(0xffe27a, 0.18).setDepth(cy - 1);
        this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
        this.add.text(cx, cy - h * TILE * 0.5 - 18, '하늘 정류장', { fontFamily: FONT, fontSize: '12px', color: '#fff6d6', backgroundColor: '#1a1438cc', padding: { x: 4, y: 1 } }).setOrigin(0.5).setDepth(9000);
      }
    }
  }

  // ---------- 지역별 구성 ----------
  private buildCloudExtras(d: typeof GameState.data) {
    // 시계탑
    this.tower = this.makeTowerVeil();
    // tower.visible = 지워진 상태(가림막 보임)
    this.tower.setVisible(!!GameState.flag('mq.gather') && !GameState.flag('mq.cloud'));
    makeQuestProps(this);
    if (GameState.flag('mq.cloud')) this.lightSkyStar(false);
    // 구름 주민
    for (const v of VILLAGERS) {
      makeFolk(this, `folk_${v.id}`, v.hat, v.id === 'piko' ? 'piko' : v.id === 'grandma' ? 'grandma' : 'folk');
      const f = feetOf(v);
      const spr = this.folkSprite(v.id, f.x, f.y + 2, v.hat);
      const tag = this.add.text(f.x, f.y + 3, this.folkName(v.id), { fontFamily: FONT, fontSize: '12px', color: '#e6e0ff', stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(f.y);
      const mark = this.add.text(f.x, f.y - Math.max(62, spr.displayHeight + 14), '…', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#e6e0ff', padding: { x: 5, y: 0 } }).setOrigin(0.5).setDepth(9000);
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
    const d = GameState.data, sc = SCRIPTS[this.mapId];
    const surveyed = !!GameState.flag(`survey.${this.mapId}`);
    for (const n of list) if (!d.bugNotes.includes(n.id) && !sc?.rewardNotes?.includes(n.id) && (surveyed || !sc?.hiddenNotes?.includes(n.id)) && !this.notes.some(x => x.id === n.id)) {
      const spr = this.add.image(n.x * TILE + TILE / 2, n.y * TILE + TILE / 2, 'note').setDepth((n.y + 1) * TILE);
      this.tweens.add({ targets: spr, y: spr.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.notes.push({ id: n.id, spr, text: n.text });
    }
  }

  private folkSprite(id: string, x: number, y: number, hat: string) {
    const t = folkTexture(this, id);
    const spr = this.add.image(x, y, t.key).setOrigin(0.5, 1).setDepth(y);
    const sc = t.height ? t.height / spr.height : 1.2;
    spr.setScale(sc);
    if (t.tint) spr.setTint(Phaser.Display.Color.HexStringToColor(hat).color | 0x606060);
    this.tweens.add({ targets: spr, scaleY: sc * 0.95, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return spr;
  }
  private regionFolks: { id: string; name: string; lines: string[] }[] = [];
  private buildRegionExtras() {
    const r = this.region!;
    makeQuestProps(this);
    this.spawnNotes(r.notes);
    this.regionFolks = [];
    for (const n of r.npcs) {
      const id = n.id;
      makeFolk(this, `folk_${id}`, n.hat, FOLK_KIND[id] ?? 'folk');
      const f = feetOf(n);
      const spr = this.folkSprite(id, f.x, f.y + 2, n.hat);
      const tag = this.add.text(f.x, f.y + 3, n.name, { fontFamily: FONT, fontSize: '12px', color: '#e6e0ff', stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(f.y);
      const mark = this.add.text(f.x, f.y - Math.max(62, spr.displayHeight + 14), '…', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#e6e0ff', padding: { x: 5, y: 0 } }).setOrigin(0.5).setDepth(9000);
      this.folks.push({ id, spr, tag, mark, x: f.x, y: f.y });
      this.regionFolks.push({ id, name: n.name, lines: n.lines });
    }
    this.refreshFolkMarks();
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
    return BLOCK.has(t);
  }
  private solidAt(px: number, py: number) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (this.bridges.has(key(tx, ty))) return false;
    if (this.blocked(this.tileAt(px, py))) return true;
    return false; // 사람·포인트는 길을 막지 않는다
  }
  private boxFree(x: number, y: number) {
    // 발밑 작은 판정 (좁은 길·모서리에서 걸리지 않게)
    return !this.solidAt(x - 5, y - 4) && !this.solidAt(x + 5, y - 4) && !this.solidAt(x - 5, y - 1) && !this.solidAt(x + 5, y - 1);
  }

  // ---------- 파티 ----------
  private get lead() { return this.actors.get(GameState.data.leader)!; }
  private followers(): Actor[] { const d = GameState.data; return d.party.filter(id => id !== d.leader).map(id => this.actors.get(id)!); }
  private orderActors() { this.cameras.main.startFollow(this.lead.spr, true, 0.12, 0.12); }

  private switchTo(id: CharId, force = false) {
    const d = GameState.data;
    if (id === d.leader || !d.party.includes(id) || (this.lock && !force)) return;
    const ep = EPISODES.find(e => GameState.flag(`ep.${e.id}.active`));
    if (ep && ep.map === this.mapId && !force && id !== ep.id) { toast(`에피소드 중에는 ${charById(ep.id).name}(이)가 리더야.`); return; }
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
    this.refreshFolkMarks(); this.updateDark();
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
    const folk = this.folks.filter(n => n.spr.visible && near(n.x, n.y, 46)).sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
    if (folk) return this.region ? this.talkRegionFolk(folk.id) : this.talkFolk(folk.id);
    // 퀘스트 오브젝트
    const th = this.nearThing(46, t => !!t.def.use || !!t.def.ability);
    if (th) {
      if (th.def.use) return this.runAct(th.def.use);
      const d = GameState.data, ab = th.def.ability ?? {};
      const who = (ab[d.leader] ? d.leader : (Object.keys(ab) as CharId[]).find(w => d.party.includes(w)));
      if (who) {
        if (who !== d.leader) { this.switchTo(who); if (d.leader !== who) return; }
        return this.runAct(ab[who]!);
      }
      return toast(this.abilityHint(th.def));
    }
    const pf = feetOf(this.pointSpot);
    if (near(pf.x, pf.y, 48)) {
      this.lock = true; this.pendingRest = false;
      await runDialogue('point_talk');
      if (this.pendingRest) await this.rest();
      this.lock = false; return;
    }
    const tf = feetOf(TOWER_SPOT);
    if (!this.region && Math.hypot(L.x - tf.x, L.y - tf.y) < 60) return this.towerInteract();
    if (this.autoAbility()) return;
    const fx = Math.floor((L.x + this.face.x * 20) / TILE), fy = Math.floor((L.y - 6 + this.face.y * 20) / TILE);
    if (this.grid[fy]?.[fx] === 'X') return this.rockHint();
    const sign = this.signs.find(s => Math.abs(s.x - fx) <= 1 && Math.abs(s.y - fy) <= 1 && near(s.x * TILE + 12, s.y * TILE + 12, 48));
    if (sign) return toast(sign.text);
    const ft = this.grid[fy]?.[fx];
    const nearS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.grid[Math.floor((L.y - 6) / TILE) + dy]?.[Math.floor(L.x / TILE) + dx] === 'S');
    if (ft === 'S' || nearS) return this.station();
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
    this.cameras.main.pan((TOWER_VEIL[0] + TOWER_VEIL[2]) / 2, TOWER_VEIL[3] - 60, 900, 'Sine.easeInOut');
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
    if (this.region) {
      for (const v of this.folks) {
        const show = this.script?.npcShow?.[v.id]?.() ?? true;
        const m = this.preview ? '' : this.script?.npcMark?.[v.id]?.() ?? '';
        v.spr.setVisible(show); v.tag.setVisible(show);
        v.mark.setText(m).setVisible(show && !!m).setBackgroundColor(m === '!' ? '#ffd66b' : '#9fe0c4');
      }
      return;
    }
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
      const ik = kind === 'piece' ? 'item_towerPieces' : 'item_letters';
      const spr = this.textures.exists(ik) ? this.add.image(s.x * TILE + 12, s.y * TILE + 12, ik).setDepth((s.y + 1) * TILE).setDisplaySize(34, 34)
        : this.add.image(s.x * TILE + 12, s.y * TILE + 12, kind === 'piece' ? 'starpiece' : 'letter').setDepth((s.y + 1) * TILE).setScale(1.3);
      if (this.textures.exists(ik)) this.glow(spr);
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
      } else if (f('sq02.done')) { this.lock = false; this.openShop('빵집 할머니의 가게'); return; }
      else toast('빵집 할머니: 이웃들 이름은 들어 봤니?');
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
    this.tweens.add({ targets: t, alpha: 0, duration: 1100, ease: 'Sine.easeIn', onComplete: () => { t.setVisible(false).setAlpha(1); this.lightSkyStar(true); } });
    const [x0, y0, x1, y1] = TOWER_VEIL;
    for (let i = 0; i < 40; i++) {
      const p = this.add.image(Phaser.Math.Between(x0, x1), Phaser.Math.Between(y0, y1), 'pixel').setTint(0xffe27a).setScale(2).setDepth(9500);
      this.tweens.add({ targets: p, y: p.y - 40, alpha: 0, duration: 900, delay: i * 20, onComplete: () => p.destroy() });
    }
    this.cameras.main.flash(500, 255, 240, 180);
    Audio.sfx('star');
  }
  private lightSkyStar(anim: boolean) {
    if (this.skyStar) return;
    const x = (TOWER_VEIL[0] + TOWER_VEIL[2]) / 2, y = TOWER_VEIL[1] + 40;
    this.skyStar = this.add.image(x, y, 'skystar').setDepth(9400).setScale(3).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.skyStar, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });
    if (anim) this.tweens.add({ targets: this.skyStar, scale: { from: 9, to: 3 }, duration: 800, ease: 'Back.out' });
  }
  private station() {
    if (!this.region && !GameState.flag('mq.cloud') && !this.preview) return toast('하늘 정류장. 하늘길이 끊겨 있어 아직 출발할 수 없다.');
    const visited = (id: string) => !!GameState.flag(`visit.${id}`);
    const avail = (id: string, act: number): string | null => {
      if (this.preview) return null;
      if (id === 'studio') return '현실로는 아직 돌아갈 수 없다';
      if (id === 'cloud') return null;
      const F = (k: string) => !!GameState.flag(k);
      if (id === 'mirror' || id === 'park') return F('mq.cloud') ? null : '1막을 끝내야 열린다';
      if (id === 'data') return F('mq.mirror') && F('mq.park') ? null : '거울의 숲과 놀이공원의 별을 먼저 켜자';
      if (id === 'garden' || id === 'station' || id === 'photo') return F('mq.datacenter') ? null : '2막(데이터 센터)을 끝내야 열린다';
      if (id === 'shadow') return F('mq.garden') && F('mq.station') && F('mq.photo') ? null : '3막 세 지역의 별을 먼저 켜자';
      if (id === 'lastsave') return F('mq.shadow') ? null : '그림자의 도시를 지나야 열린다';
      void visited; void act;
      return '…아직 아무도 모르는 곳이다';
    };
    // 추천: 열려 있고 아직 별을 못 켠 첫 지역
    const rec = this.preview ? undefined : MAP_ORDER.find(m => m.id !== 'studio' && m.id !== 'trash' && !avail(m.id, m.act) && !GameState.flag(MQ_OF[m.id] ?? '-'));
    const list = MAP_ORDER.filter(m => m.id !== this.mapId && (this.preview || m.id !== 'studio') && (this.preview || m.id !== 'trash' || !avail(m.id, m.act)));
    if (rec) list.sort((a, b) => Number(b.id === rec.id) - Number(a.id === rec.id));
    const opts = list.map(m => {
      const lock = avail(m.id, m.act);
      return { label: `${m.id === rec?.id ? '▶ 추천 · ' : ''}${m.name}${lock ? ' (잠김)' : GameState.flag(MQ_OF[m.id] ?? '-') ? ' ★' : ''}`, act: () => lock ? toast(lock) : this.travel(m.id) };
    });
    opts.push({ label: '닫기', act: () => {} });
    Bus.emit('menu', this.preview ? '맵 둘러보기 — 어디로 갈까?' : '하늘 정류장 — 어디로 갈까?', opts, this.preview ? '둘러보기 모드: 시간이 흐르지 않고 저장되지 않아요.' : '처음 가는 곳은 2시간, 가 본 곳은 1시간이 흐른다. ★ = 별을 되찾은 지역');
  }
  private travel(id: string) {
    const d = GameState.data;
    this.lock = true;
    if (!this.preview) GameState.spend(GameState.flag(`visit.${id}`) ? 1 : 2, '이동');
    d.pos = { x: 0, y: 0 };
    Audio.sfx('warp');
    this.cameras.main.zoomTo(1.12, 520, 'Sine.in');
    Bus.emit('wipe', 'out', () => this.scene.restart({ from: 'travel', map: id }));
  }
  private async talkRegionFolk(id: string) {
    const talk = this.script?.talk?.[id];
    if (talk && !this.preview) return this.runAct(talk);
    const f = this.regionFolks.find(x => x.id === id); if (!f) return;
    this.lock = true;
    await new Promise<void>(res => Bus.emit('lines', f.lines.map(t => ({ name: f.name, por: `folk_${id}`, text: t })), res));
    this.lock = false;
  }

  private async rest() {
    const d = GameState.data;
    const F = (k: string) => !!GameState.flag(k);
    const scenes: [string, string[], boolean][] = [['rest_1', ['rumung', 'haming'], true], ['rest_2', ['dotcha', 'ttuning'], true], ['rest_3', ['darae', 'eune'], true], ['rest_4', ['dodamhi', 'shiro'], true], ['rest_5', ['bigwin'], true],
      ['rest_6', ['dodamhi', 'eune'], F('visit.mirror')], ['rest_8', ['rumung', 'dotcha'], F('visit.park')], ['rest_7', ['ttuning', 'darae'], F('mq.datacenter')], ['rest_9', ['haming', 'bigwin'], F('visit.garden')],
      ['rest_10', ['shiro', 'darae'], F('visit.station')], ['rest_11', ['ttuning', 'dodamhi'], F('visit.photo')], ['rest_12', ['bigwin', 'rumung'], F('mq.shadow')]];
    const pick = scenes.find(([k, who, ok]) => ok && !GameState.flag(`rest.${k}`) && who.every(w => d.party.includes(w as CharId)));
    this.cameras.main.fadeOut(500, 8, 6, 24);
    await new Promise(r => this.time.delayedCall(600, r));
    const tea = !!GameState.flag('buff.tea'); GameState.setFlag('buff.tea', false);
    GameState.spend(tea ? 4 : 6, tea ? '따뜻한 차를 마시고 휴식' : '휴식');
    GameState.setBw(GameState.bwMax());
    if (pick) {
      this.cameras.main.fadeIn(400, 8, 6, 24);
      await runDialogue(pick[0]);
      GameState.setFlag(`rest.${pick[0]}`);
      pick[1].forEach(w => GameState.addBond(w));
    } else { this.cameras.main.fadeIn(400, 8, 6, 24); toast('푹 쉬었다.'); }
    this.refreshThings();
  }
  private async timeUp() {
    if (this.lock && GameState.flag('time.up')) return;
    GameState.setFlag('time.up'); this.lock = true;
    // 진행 중인 대화가 끝나면 엔딩으로
    while (UIState.busy) await new Promise(r => this.time.delayedCall(200, r));
    await new Promise(r => this.time.delayedCall(800, r));
    Audio.bgm(null);
    this.goEnding('reset');
  }
  private openMainMenu() {
    Bus.emit('menu', '일시정지', [
      { label: '계속하기', act: () => {} },
      { label: '힌트 — 다음에 뭘 하지?', act: () => this.showHint() },
      { label: '조작 다시 보기', act: () => this.howTo() },
      { label: '이 지역 공략 보기 (새 창)', act: () => { try { window.open(`/wiki/region/${this.mapId}/`, '_blank', 'noopener'); } catch { /* 무시 */ } } },
      { label: '퀘스트 (J)', act: () => this.showQuests() },
      { label: '가방 (I)', act: () => this.showBag() },
      { label: '동료 · 유대', act: () => this.showParty() },
      { label: `앨범 (${GameState.data.album.length}/36)`, act: () => this.showAlbum() },
      { label: '지도 (M)', act: () => this.showMap(false) },
      { label: Audio.muted ? '소리 켜기' : '소리 끄기', act: () => { Audio.setMuted(!Audio.muted); toast(Audio.muted ? '소리를 껐어요.' : '소리를 켰어요.'); } },
      { label: '저장은 포인트(★)에게', act: () => toast('광장의 별, 포인트에게 말을 걸면 저장할 수 있어.') },
      { label: '버그 제보', act: () => this.report() },
      { label: '타이틀로', act: () => this.scene.start('Title') },
    ]);
  }
  private async report() {
    const lead = this.actors.get(GameState.data.leader)!;
    const tx = Math.floor(lead.x / TILE), ty = Math.floor(lead.y / TILE), d = GameState.data;
    this.lock = true; UIState.busy = true;
    const sent = await showReport(`${regionName(this.mapId)} (${tx}, ${ty})`, this.mapId, tx, ty,
      { leader: d.leader, hours: d.hoursLeft, difficulty: d.difficulty ?? 'normal', ua: navigator.userAgent.slice(0, 160), flags: Object.keys(d.flags).filter(k => k.startsWith('mq')).slice(0, 40) });
    this.lock = false; UIState.busy = false;
    if (sent) toast('제보를 보냈어요. 고마워요!');
  }
  /** 지금 할 일을 짧게 알려 준다 (메인 퀘스트 기준) */
  private showHint() {
    const d = GameState.data, q = questLog();
    const MQ_MAP: Record<string, string[]> = { cloud: ['MQ01', 'MQ02'], mirror: ['MQ03'], park: ['MQ04'], data: ['MQ05'], garden: ['MQ06'], station: ['MQ07'], photo: ['MQ08'], shadow: ['MQ09'], lastsave: ['MQ10'] };
    const here = q.find(x => !x.done && (MQ_MAP[this.mapId] ?? []).includes(x.id));
    const other = q.find(x => !x.done && x.kind === '메인');
    const lines: string[] = [];
    const main = here ?? other;
    if (main) {
      lines.push(`[${main.title}]`, main.desc);
      if (!here && other) lines.push(`(이 퀘스트는 ${regionName(Object.keys(MQ_MAP).find(k => MQ_MAP[k].includes(other.id)) ?? '')}에 있어. 하늘 정류장으로 가자.)`);
      const need = CHAR_IDS.filter(id => main.desc.includes(charById(id).name));
      if (need.length && !need.includes(d.leader)) lines.push(`→ 지금 리더는 ${charById(d.leader).name}. 숫자키(모바일은 아래 얼굴)로 ${need.map(id => `${charById(id).name}(${CHAR_IDS.indexOf(id) + 1})`).join(' · ')}(으)로 바꾸자.`);
      if (main.desc.includes('빅윈') && GameState.bwCharges() <= 0) lines.push('→ 빅윈 권한이 0이야. 포인트(★)에서 휴식하거나 별사탕을 쓰자.');
      if (main.desc.includes('측량')) lines.push('→ 다래로 Q를 누른 뒤 M으로 지도를 열면 숨은 것이 보인다.');
    } else {
      const open = MAP_ORDER.filter(m => m.id !== 'studio' && !GameState.flag(MQ_OF[m.id] ?? '-'));
      lines.push(open.length ? `이 지역의 별은 켰어. 하늘 정류장에서 아직 별이 꺼진 곳으로 가 보자: ${open.slice(0, 3).map(m => m.name).join(', ')}` : '모든 별을 켰다!');
    }
    const eps = EPISODES.filter(episodeOpen).map(e => `${charById(e.id).name}(${regionName(e.map)})`);
    if (eps.length) lines.push(`♥ 열린 개인 에피소드: ${eps.join(', ')}`);
    const subs = q.filter(x => !x.done && x.kind === '서브' && x.id !== 'EP').length;
    if (subs) lines.push(`진행 중인 서브 퀘스트 ${subs}개 — J에서 확인.`);
    lines.push(`남은 시간 ${Math.floor(d.hoursLeft)}시간${d.difficulty === 'easy' ? ' (여유 모드: 시간이 절반만 흐름)' : ''}`);
    Bus.emit('menu', '힌트', [{ label: '퀘스트 보기', act: () => this.showQuests() }, { label: '닫기', act: () => {} }], lines.join('\n'));
  }
  private showQuests(done = false) {
    const q = questLog();
    const act = q.filter(x => !x.done), fin = q.filter(x => x.done);
    const body = done
      ? fin.map(x => `✔ [${x.kind}] ${x.title}`).join('\n') || '아직 끝낸 퀘스트가 없다.'
      : act.map(x => `▸ [${x.kind}] ${x.title}\n   ${x.desc}`).join('\n') || '진행 중인 퀘스트가 없다. 하늘 정류장에서 다음 지역으로 가 보자.';
    Bus.emit('menu', done ? `완료한 퀘스트 ${fin.length}개` : `진행 중인 퀘스트 ${act.length}개`, [
      { label: done ? '진행 중 보기' : `완료한 것 보기 (${fin.length})`, act: () => this.showQuests(!done) },
      { label: '힌트', act: () => this.showHint() },
      { label: '닫기', act: () => {} },
    ], body);
  }
  private showBag() {
    const d = GameState.data;
    const grid = Object.entries(d.inventory).filter(([k, n]) => n > 0 && k !== 'epfrag')
      .map(([k, n]) => ({ icon: `item_${k}`, name: ITEM_NAMES[k]?.name ?? k, count: n, desc: ITEM_NAMES[k]?.desc ?? '', on: d.equip.includes(k) }));
    const lines = [grid.length ? '' : '가방이 비어 있다.', `버그 노트 ${countNotes(d.bugNotes)}/${NOTE_TOTAL} · 세계 기억 ${d.memories.world}/8 · 핵심 기억 ${d.memories.core.length}/9 · 설계자 권한 ${GameState.bwCharges()}/${GameState.bwMax()}`].filter(Boolean);
    const opts: { label: string; act: () => void; icon?: string }[] = [];
    if (GameState.item('starCandy') > 0) opts.push({ icon: 'item_starCandy', label: '별사탕 쓰기', act: () => {
      if (GameState.bwCharges() >= GameState.bwMax()) return toast('설계자 권한이 이미 가득 찼어.');
      GameState.addItem('starCandy', -1); GameState.setBw(GameState.bwCharges() + 1); Audio.sfx('star'); toast(`설계자 권한 충전! (${GameState.bwCharges()}/${GameState.bwMax()})`);
    } });
    if (GameState.item('tea') > 0 && !GameState.flag('buff.tea')) opts.push({ icon: 'item_tea', label: '따뜻한 차 마시기', act: () => { GameState.addItem('tea', -1); GameState.setFlag('buff.tea'); toast('몸이 따뜻해졌다. 다음 휴식은 4시간이면 된다.'); } });
    if (GameState.item('cotton') > 0) opts.push({ icon: 'item_cotton', label: '구름솜 쓰기', act: () => { GameState.addItem('cotton', -1); GameState.setFlag('buff.cotton', ((GameState.flag('buff.cotton') as number) || 0) + 5); toast('구름 발판이 다섯 번 동안 두 배로 오래 간다.'); } });
    for (const s of SHOP.filter(x => x.acc && GameState.item(x.k) > 0)) {
      const on = d.equip.includes(s.k);
      opts.push({ icon: `item_${s.k}`, label: `${on ? '해제' : '장착'}: ${ITEM_NAMES[s.k].name}`, act: () => {
        if (on) d.equip = d.equip.filter(k => k !== s.k);
        else if (d.equip.length >= GameState.equipSlots()) return toast(`액세서리 칸이 가득 찼어. (${GameState.equipSlots()}칸)`);
        else d.equip.push(s.k);
        toast(`${ITEM_NAMES[s.k].name} ${on ? '해제' : '장착'}`);
      } });
    }
    opts.push({ label: '닫기', act: () => {} });
    Bus.emit('menu', '가방', opts, lines.join('\n'), grid);
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
    if (t === 'tower_light') { if (this.region) this.starBurst(); else if (GameState.data.party.length === 9 && !GameState.flag('mq.cloud')) this.restoreTower(); else this.starBurst(); }
    if (t === 'act_clear') this.time.delayedCall(50, () => this.actClear());
    if (t === 'save' && this.preview) { toast('둘러보기 모드에서는 저장하지 않아요.'); return; }
    if (t === 'save') {
      this.storePos();
      GameState.save().then(r => { if (r) Audio.sfx('save'); toast(r === 'cloud' ? '저장했어요. 다시 로그인해도 이어할 수 있어요.' : r === 'local' ? '서버에 닿지 않아 이 기기에만 저장했어요. 연결되면 다시 저장해 주세요.' : '저장에 실패했어요.'); });
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
    t.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 1200, ease: 'Stepped', easeParams: [8] });
  }
  private cronFlash() {
    const x = (TOWER_VEIL[0] + TOWER_VEIL[2]) / 2, y = TOWER_VEIL[3] + 30;
    const o = this.add.image(x, y, this.textures.exists('npc_cron') ? 'npc_cron' : 'cron').setOrigin(0.5, 1).setScale(1.6).setDepth(9000).setTint(0x8080c0);
    this.tweens.add({ targets: o, alpha: { from: 0, to: 1 }, duration: 80, yoyo: true, repeat: 5, onComplete: () => o.destroy() });
  }

  // ---------- 능력 ----------
  private useAbility() {
    if (this.abilityCd > 0) return;
    this.abilityCd = 0.4;
    const L = this.lead, id = GameState.data.leader;
    const tx = Math.floor(L.x / TILE), ty = Math.floor((L.y - 4) / TILE);
    // 근처 오브젝트에 맞는 능력이 있으면 그걸 쓴다
    const th = this.nearThing(52, t => !!t.def.ability);
    if (th) {
      const fn = th.def.ability![id];
      if (fn) return this.runAct(fn);
      const alt = (Object.keys(th.def.ability!) as CharId[]).find(w => GameState.data.party.includes(w));
      if (alt && id !== 'darae') { this.switchTo(alt); if (GameState.data.leader === alt) return this.runAct(th.def.ability![alt]!); }
      if (id !== 'darae' && !(id === 'dotcha' && this.raceState)) return toast(this.abilityHint(th.def));
    }
    if (this.guideNeed && this.guideNeed.who !== id && this.autoAbility()) return;
    if (id === 'rumung') return this.cloudStep(tx, ty);
    if (id === 'dotcha') { if (this.raceState) { this.boost = 1.2; this.abilityCd = 1.8; Audio.sfx('dash'); return; } return this.dash(tx, ty); }
    if (id === 'haming') return this.bloom(tx, ty);
    if (id === 'darae') return this.survey();
    if (id === 'shiro') { toast(this.script?.dark ? '밤눈! 시로가 앞장서면 어둠 속이 환히 보인다.' : '시로는 고양이 길(좁은 창살 틈)을 그냥 지나갈 수 있어.'); return; }
    if (id === 'eune') { Audio.sfx('save'); this.cameras.main.flash(120, 255, 255, 255); toast('찰칵. 촬영 지점에서 찍으면 앨범에 남는다.'); return; }
    if (id === 'dodamhi') { toast('여기엔 읽을 잔향이 없어. 반짝이는(✦) 물건 근처에서 써 보자.'); return; }
    if (id === 'ttuning') { toast('해석할 장치가 없어. 단말기나 제어반 근처에서 써 보자.'); return; }
    if (id === 'bigwin') { toast(`설계자 권한을 쓸 대상이 없어. (충전 ${GameState.bwCharges()}/${GameState.bwMax()})`); return; }
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
    const cot = (GameState.flag('buff.cotton') as number) || 0;
    if (cot > 0) GameState.setFlag('buff.cotton', cot - 1);
    this.time.delayedCall(cot > 0 ? 24000 : 12000, expire);
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

  // ═════════════════════════ 2~4막 공용 시스템 ═════════════════════════

  /** 지역 스크립트 실행 (대화·퍼즐 동안 조작을 막는다) */
  private async runAct(fn: (c: Ctx) => void | Promise<void>) {
    if (this.lock) return;
    this.lock = true;
    try { await fn(this.ctx()); } finally { this.lock = false; this.refreshThings(); this.refreshFolkMarks(); Bus.emit('hud-refresh'); }
  }

  private ctx(): Ctx {
    const self = this;
    return {
      map: this.mapId,
      get leader() { return GameState.data.leader; },
      say: k => runDialogue(k),
      toast,
      puzzle: (cfg: PuzzleCfg) => runPuzzle(this, cfg),
      spend: (h, why) => GameState.spend(h, why),
      give: (k, n = 1) => { if (k === 'starShard' && GameState.equipped('acc_brooch')) n = Math.round(n * 1.5); GameState.addItem(k, n); Audio.sfx('get'); },
      item: k => GameState.item(k),
      bond: (...ids) => ids.forEach(i => GameState.addBond(i)),
      note: id => { if (!GameState.data.bugNotes.includes(id)) GameState.data.bugNotes.push(id); Bus.emit('hud-refresh'); },
      world: () => GameState.world(1 + WORLD_MQ.filter(k => GameState.flag(k)).length),
      need: (id, what) => {
        if (GameState.data.leader === id) return true;
        toast(`${what} ${charById(id).name}(이)가 앞장서야 해. (${SWITCH_HINT(CHAR_IDS.indexOf(id) + 1)})`); return false;
      },
      switchTo: id => this.switchTo(id, true),
      refresh: () => { this.refreshThings(); this.refreshFolkMarks(); Bus.emit('hud-refresh'); },
      fx: k => {
        if (k === 'flash') this.cameras.main.flash(300, 255, 255, 255);
        if (k === 'shake') { this.cameras.main.shake(200, 0.01); Audio.sfx('dash'); }
        if (k === 'glitch') { glitchBurst(this, 0.6); Audio.sfx('glitch'); }
        if (k === 'star') { Audio.sfx('star'); this.sparkle(this.lead.x, this.lead.y - 30, 0xffe27a); }
      },
      photo: (id, cap) => {
        const d = GameState.data;
        if (d.album.includes(id)) return toast('이미 찍은 자리다.');
        d.album.push(id); GameState.setFlag(`photo.${id}`, cap);
        this.cameras.main.flash(180, 255, 255, 255); Audio.sfx('save');
        toast(`찰칵! 앨범에 「${cap}」 (${d.album.length}/36)`);
        this.refreshThings();
      },
      shop: t => this.openShop(t),
      menu: (t, o, b) => Bus.emit('menu', t, o, b),
      mirrorMode: goal => {
        this.mirrored = !!goal; GameState.setFlag('mode.mirror', !!goal);
        toast(goal ? '좌우가 뒤바뀌었다! (왼쪽 ↔ 오른쪽)' : '좌우가 원래대로 돌아왔다.');
      },
      race: (flags, secs, onWin) => this.startRace(flags, secs, onWin),
      chase: (a, b, lamps, onWin) => this.startChase(a, b, lamps, onWin),
      ending: k => this.goEnding(k),
      wait: ms => new Promise(r => self.time.delayedCall(ms, r)),
      bw: () => {
        const n = GameState.bwCharges(), max = GameState.bwMax();
        if (!this.preview && n <= 0) { toast('설계자 권한 충전이 없어. 별사탕을 쓰거나 포인트에게서 쉬면 충전돼.'); return false; }
        if (!this.preview) GameState.setBw(n - 1);
        this.cameras.main.flash(200, 230, 189, 74); Audio.sfx('glitch');
        toast(`설계자 권한 사용 (${GameState.bwCharges()}/${max})`);
        return true;
      },
    };
  }

  private abilityHint(t: Thing) {
    const who = Object.keys(t.ability ?? {}) as CharId[];
    if (!who.length) return '무언가 할 수 있을 것 같은데…';
    return `${who.map(w => `${charById(w).name}(${CHAR_IDS.indexOf(w) + 1})`).join(' 또는 ')}의 능력이 필요해 보인다.`;
  }

  // ---------- 퀘스트 오브젝트 ----------
  private episodeThings(): Thing[] {
    const out: Thing[] = [];
    for (const e of EPISODES.filter(x => x.map === this.mapId)) {
      const act = `ep.${e.id}.active`;
      out.push({
        id: `ep_${e.id}`, at: e.at, tex: 'memory', label: `${charById(e.id).name}의 기억`,
        show: () => (episodeOpen(e) && !(GameState.flag(act) && e.frags)) && !this.preview,
        use: c => this.episode(e, c), mark: () => '♥',
      });
      (e.frags ?? []).forEach((a, i) => out.push({
        id: `ep_${e.id}_f${i}`, at: a, tex: e.fragTex ?? 'page', once: true, show: () => !!GameState.flag(act),
        touch: async c => {
          c.give('epfrag'); const n = c.item('epfrag');
          if (n >= e.frags!.length) await this.finishEpisode(e, c); else toast(`${e.fragName}을(를) 찾았다. (${n}/${e.frags!.length})`);
        },
      }));
    }
    return out;
  }
  private async episode(e: Episode, c: Ctx) {
    const act = `ep.${e.id}.active`;
    if (GameState.data.leader !== e.id) this.switchTo(e.id, true);
    if (!GameState.flag(act)) { GameState.setFlag(act); GameState.data.inventory.epfrag = 0; await c.say(`ep_${e.id}_start`); }
    if (e.frags) { this.refreshThings(); return; }
    if (e.puzzle) {
      const r = await c.puzzle(e.puzzle);
      if (r !== 'ok') { toast('기억이 아직 흐릿하다. 다시 다가가 보자.'); return; }
    }
    await this.finishEpisode(e, c);
  }
  private async finishEpisode(e: Episode, c: Ctx) {
    await c.say(`ep_${e.id}_end`);
    const d = GameState.data;
    GameState.setFlag(`ep.${e.id}.active`, false); GameState.setFlag(`ep.${e.id}`);
    if (!d.memories.core.includes(e.id)) d.memories.core.push(e.id);
    d.inventory.epfrag = 0;
    if (e.reward) GameState.addItem(e.reward);
    GameState.spend(2, `에피소드 「${e.title}」`);
    toast(`핵심 기억 ${d.memories.core.length}/9 — ${e.star}`);
    this.refreshThings(); Bus.emit('hud-refresh');
  }

  /** 필드 오브젝트 텍스처. 아이템 그림이 있으면 그걸 쓰고 크기를 맞춘다 */
  private setThingTex(spr: Phaser.GameObjects.Image, tex: string) {
    const item = THING_ITEM[tex];
    if (item && this.textures.exists(`item_${item}`)) { spr.setTexture(`item_${item}`).setDisplaySize(34, 34); this.glow(spr); }
    else spr.setTexture(`th_${tex}`).setScale(1.3);
  }
  /** 배경에 묻히지 않게 아이템 그림에 옅은 빛 테두리 */
  private glow(spr: Phaser.GameObjects.Image) {
    if ((spr as any).__glow || !spr.preFX) return;
    (spr as any).__glow = spr.preFX.addGlow(0xfff6d6, 3, 0, false, 0.1, 10);
  }
  private buildThings(spawn: Pt) {
    const r = this.region;
    const anchors: Pt[] = [this.pointSpot, ...this.signs, ...(r ? r.npcs : VILLAGERS), ...(r ? r.notes : BUG_NOTES)];
    this.layout = new Layout(this.grid, spawn, anchors);
    const defs = [...(this.script?.things ?? []), ...this.episodeThings()];
    for (const def of defs) {
      const p = this.resolve(def.at, spawn);
      const x = p.x * TILE + TILE / 2, y = (p.y + 1) * TILE - 2;
      const tex = typeof def.tex === 'function' ? def.tex() : def.tex;
      const spr = this.add.image(x, y, `th_${tex}`).setOrigin(0.5, 1).setDepth(y); this.setThingTex(spr, tex);
      if (def.once || tex === 'memory' || tex === 'photo' || tex === 'goal' || tex === 'firefly') this.tweens.add({ targets: spr, y: y - 5, duration: 700 + (x % 300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const label = typeof def.label === 'function' ? def.label() : def.label ?? '';
      const tag = this.add.text(x, y + 2, label, { fontFamily: FONT, fontSize: '12px', color: '#fff6d6', stroke: '#1a1438', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(9000).setVisible(false);
      const mark = this.add.text(x, y - spr.displayHeight - 16, '', { fontFamily: FONT, fontSize: '24px', color: '#1a1438', backgroundColor: '#ffd66b', padding: { x: 6, y: 0 } }).setOrigin(0.5).setDepth(9000).setVisible(false);
      this.tweens.add({ targets: mark, y: mark.y - 4, duration: 500, yoyo: true, repeat: -1 });
      this.things.push({ def, spr, tag, mark, x, y, key: `${this.mapId}:${def.id}`, tile: p });
    }
    this.refreshThings();
  }
  private resolve(a: Anchor, spawn: Pt): Pt {
    if (a.gated) return this.layout.near(spawn, true);
    let base: Pt | null = null;
    if (a.sign) base = this.signs.find(s => s.key === a.sign) ?? null;
    else if (a.npc) base = (this.region ? this.region.npcs : VILLAGERS).find(n => n.id === a.npc) ?? null;
    else if (a.note) base = (this.region ? this.region.notes : BUG_NOTES).find(n => n.id === a.note) ?? null;
    else if (a.pos && !this.region) base = cloudPos(a.pos);
    else if (a.point) base = this.pointSpot;
    else if (a.spawn) base = spawn;
    if (!base) return this.layout.far(a.far ?? 0);
    return this.layout.near({ x: base.x + (a.dx ?? 0), y: base.y + (a.dy ?? 0) });
  }
  private thingVisible(t: ThingInst) {
    const d = t.def;
    if (d.once && GameState.data.picked.includes(t.key)) return false;
    if (d.hidden && !GameState.flag(`survey.${this.mapId}`)) return false;
    return d.show ? !!d.show() : true;
  }
  private refreshThings() {
    for (const t of this.things) {
      const v = this.thingVisible(t);
      t.spr.setVisible(v);
      if (v) { const tex = typeof t.def.tex === 'function' ? t.def.tex() : t.def.tex; this.setThingTex(t.spr, tex); }
      const m = v && !this.preview ? t.def.mark?.() ?? '' : '';
      t.mark.setText(m).setVisible(!!m).setBackgroundColor(m === '♥' ? '#ff9ec4' : m === '✦' ? '#d9ccff' : '#ffd66b');
      if (!v) t.tag.setVisible(false);
      const label = typeof t.def.label === 'function' ? t.def.label() : t.def.label ?? '';
      t.tag.setText(label);
    }
    if (this.region) this.spawnNotes(this.region.notes);
    if (this.darkImg) this.updateDark();
  }
  private nearThing(r: number, pred: (t: ThingInst) => boolean) {
    const L = this.lead;
    return this.things.filter(t => t.spr.visible && pred(t) && Math.hypot(t.x - L.x, t.y - L.y) < r)
      .sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
  }
  private updateThings(busy: boolean) {
    const L = this.lead;
    const near = this.nearThing(52, () => true);
    for (const t of this.things) t.tag.setVisible(t === near && !!t.tag.text);
    if (busy) return;
    for (const t of this.things) {
      if (!t.spr.visible || !t.def.touch) continue;
      if (Math.hypot(t.x - L.x, t.y - L.y) > 22) continue;
      if (t.def.once) { GameState.data.picked.push(t.key); t.spr.setVisible(false); t.tag.setVisible(false); t.mark.setVisible(false); }
      this.runAct(t.def.touch);
      return;
    }
  }
  private sparkle(x: number, y: number, col: number) {
    for (let i = 0; i < 16; i++) {
      const p = this.add.image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), 'pixel').setTint(col).setScale(2).setDepth(9500);
      this.tweens.add({ targets: p, y: p.y - 30, alpha: 0, duration: 700, delay: i * 20, onComplete: () => p.destroy() });
    }
  }
  /** 지역의 별이 켜질 때 */
  private starBurst() {
    const cam = this.cameras.main;
    this.cameras.main.flash(500, 255, 240, 180); Audio.sfx('star');
    const s = this.add.image(480, 70, 'skystar').setScrollFactor(0).setDepth(9700).setScale(10).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, scale: 3, duration: 900, ease: 'Back.out' });
    this.tweens.add({ targets: s, alpha: 0, delay: 1800, duration: 800, onComplete: () => s.destroy() });
    void cam;
  }

  // ---------- 다래 측량 · 지도 ----------
  private survey() {
    const key = `survey.${this.mapId}`;
    const before = this.things.filter(t => t.spr.visible).length;
    GameState.setFlag(key);
    this.refreshThings();
    const hiddenNotes = (this.script?.hiddenNotes ?? []).filter(id => !GameState.data.bugNotes.includes(id)).length;
    const shown = this.things.filter(t => t.spr.visible).length - before + hiddenNotes;
    Audio.sfx('cloud');
    this.showMap(true);
    toast(shown > 0 ? `측량 완료! 지도에 숨은 것들이 드러났다.` : '측량 완료. 이 지역엔 더 숨은 게 없어 보인다.');
  }
  private showMap(survey: boolean) {
    if (this.mapOverlay) { this.mapOverlay.destroy(); this.mapOverlay = undefined; }
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(9900);
    const s = Math.min(840 / this.cols, 400 / this.rows), w = this.cols * s, h = this.rows * s, x0 = (960 - w) / 2, y0 = 80;
    const g = this.add.graphics();
    g.fillStyle(0x0b0820, 0.85).fillRect(x0 - 12, y0 - 36, w + 24, h + 60).lineStyle(2, survey ? 0x7cc06a : 0xf5f0ff, 1).strokeRect(x0 - 12, y0 - 36, w + 24, h + 60);
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const t = this.grid[y][x];
      const col = t === '.' || t === ',' || t === '=' ? 0x5a6fa8 : t === 'S' ? 0xffe27a : t === 'X' ? 0x9c93b8 : t === 'V' ? 0x7cc06a : t === 'g' ? 0xd9ccff : -1;
      if (col >= 0) g.fillStyle(col, 1).fillRect(x0 + x * s, y0 + y * s, Math.ceil(s), Math.ceil(s));
    }
    const dot = (px: number, py: number, col: number, r = 3) => g.fillStyle(col, 1).fillRect(x0 + px / TILE * s - r, y0 + py / TILE * s - r, r * 2, r * 2);
    for (const t of this.things) if (t.spr.visible) dot(t.x, t.y - 6, t.def.hidden ? 0xff7aa8 : 0xffd66b);
    for (const n of this.notes) dot(n.spr.x, n.spr.y, 0xffffff, 2);
    for (const f of this.folks) if (f.spr.visible) dot(f.x, f.y, 0x9fe0c4);
    const pf = feetOf(this.pointSpot); dot(pf.x, pf.y, 0xffe27a, 4);
    dot(this.lead.x, this.lead.y, 0xff5c7a, 4);
    c.add(g);
    c.add(this.add.text(x0, y0 - 28, `${survey ? '다래의 측량 — ' : ''}${this.region?.name ?? '구름 위의 마을'}`, { fontFamily: FONT, fontSize: '12px', color: '#f5f0ff' }));
    let lx = x0 + w - 330;
    for (const [col, name] of [[0xff5c7a, '나'], [0xffe27a, '포인트·오브젝트'], [0xff7aa8, '숨은 것'], [0x9fe0c4, '주민'], [0xffffff, '노트']] as [number, string][]) {
      g.fillStyle(col, 1).fillRect(lx, y0 - 22, 8, 8);
      const t = this.add.text(lx + 12, y0 - 28, name, { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' }); c.add(t); lx += 24 + t.width;
    }
    this.mapOverlay = c;
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.time.delayedCall(survey ? 3200 : 4200, () => { if (this.mapOverlay === c) { this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }); this.mapOverlay = undefined; } });
  }

  // ---------- 어둠 · 오류 ----------
  private makeDark() {
    const key = 'darkvignette';
    if (!this.textures.exists(key)) {
      const t = this.textures.createCanvas(key, 960, 540)!; const cx = t.getContext();
      const gr = cx.createRadialGradient(480, 300, 60, 480, 300, 520);
      gr.addColorStop(0, 'rgba(8,6,24,0)'); gr.addColorStop(0.35, 'rgba(8,6,24,0.55)'); gr.addColorStop(1, 'rgba(8,6,24,0.97)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 960, 540); t.refresh();
    }
    this.darkImg = this.add.image(0, 0, key).setOrigin(0).setScrollFactor(0).setDepth(9600);
    this.updateDark();
  }
  private updateDark() { if (this.darkImg) this.darkImg.setAlpha(GameState.data.leader === 'shiro' ? 0.25 : 0.95); }
  private errorOverlay() {
    if (this.preview) return;
    const done = MQ_OF[this.mapId] ? !!GameState.flag(MQ_OF[this.mapId]) : true;
    const level = (done ? 0 : 1) + (GameState.data.hoursLeft < 24 ? 1 : 0);
    if (!level) return;
    let seed = [...this.mapId].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const g = this.add.graphics().setDepth(-9);
    const W = this.cols * TILE, H = this.rows * TILE;
    for (let i = 0; i < level * 70; i++) {
      const x = Math.floor(rnd() * W / 12) * 12, y = Math.floor(rnd() * H / 12) * 12, n = 1 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) g.fillStyle(rnd() < 0.1 ? 0xff5c7a : rnd() < 0.2 ? 0x7cf0c8 : 0x0b0820, 0.85).fillRect(x + Math.floor(rnd() * 4) * 12, y + Math.floor(rnd() * 3) * 12, 12, 12);
    }
    this.tweens.add({ targets: g, alpha: 0.7, duration: 400, yoyo: true, repeat: -1 });
    if (level >= 2) this.time.addEvent({ delay: 18000, loop: true, callback: () => { if (!UIState.busy) { glitchBurst(this, 0.4); Audio.sfx('glitch'); } } });
  }

  // ---------- 레이스 (SQ06) ----------
  private startRace(flags: string[], secs: number, onWin: (c: Ctx) => void | Promise<void>) {
    this.raceState = { flags, next: 0, t: secs, onWin };
    GameState.setFlag('mode.race'); GameState.setFlag('race.next', 0);
    this.refreshThings(); toast('출발! 깃발 1번부터 순서대로! Q(B)로 가속!');
  }
  private updateRace(dt: number) {
    const r = this.raceState!; r.t -= dt;
    this.modeText.setVisible(true).setText(`레이스 ${Math.max(0, Math.ceil(r.t))}초 · 깃발 ${r.next}/${r.flags.length}`);
    const t = this.things.find(x => x.def.id === r.flags[r.next]);
    if (t && Math.hypot(t.x - this.lead.x, t.y - this.lead.y) < 30) {
      r.next++; GameState.setFlag('race.next', r.next); Audio.sfx('get'); this.refreshThings();
      if (r.next >= r.flags.length) { const win = r.onWin; this.endRace(); toast('골인!'); this.runAct(win); return; }
    }
    if (r.t <= 0) { this.endRace(); toast('시간 초과! 오락실 주인에게 다시 말을 걸면 재도전할 수 있어.'); }
  }
  private endRace() { this.raceState = null; GameState.setFlag('mode.race', false); this.modeText.setVisible(false); this.refreshThings(); }

  // ---------- 크론 추격 (MQ09) ----------
  private startChase(startId: string, goalId: string, lamps: string[], onWin: (c: Ctx) => void | Promise<void>) {
    const st = this.things.find(t => t.def.id === startId)!, gl = this.things.find(t => t.def.id === goalId)!;
    lamps.forEach(l => { GameState.setFlag(`chase.${l}`, false); GameState.setFlag(`chase.${l}.used`, false); });
    GameState.setFlag('mode.chase');
    const L = this.lead;
    const cron = (this.textures.exists('npc_cron_walk') ? this.add.sprite(st.x, st.y, 'npc_cron_walk', 0).setScale(1.35) : this.add.image(st.x, st.y, 'cron').setScale(1.2)).setOrigin(0.5, 1).setDepth(st.y) as Phaser.GameObjects.Sprite;
    this.chaseState = { cron, x: st.x, y: st.y, start: { x: L.x, y: L.y }, goal: { x: gl.x, y: gl.y }, lamps, stun: 0, delay: 2.5, field: null, fieldT: 0, onWin };
    this.refreshThings();
    Audio.bgm('shadow');
  }
  private chaseField() {
    const L = this.lead, W = this.cols, H = this.rows;
    const f = new Int32Array(W * H).fill(-1);
    const sx = Math.floor(L.x / TILE), sy = Math.floor((L.y - 4) / TILE);
    const q = [sx + sy * W]; f[q[0]] = 0;
    const pass = (t: string) => !BLOCK.has(t) && t !== 'g' && t !== ' ';
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = nx + ny * W; if (f[k] >= 0 || !pass(this.grid[ny][nx])) continue;
        f[k] = f[c] + 1; q.push(k);
      }
    }
    return f;
  }
  private async updateChase(dt: number) {
    const c = this.chaseState!, L = this.lead;
    this.modeText.setVisible(true).setText(c.stun > 0 ? '꽃등에 크론이 멈칫했다! 지금이야!' : '크론에게서 도망쳐! 빛나는 탈출구로! (Shift 달리기)');
    c.fieldT -= dt;
    if (c.fieldT <= 0 || !c.field) { c.field = this.chaseField(); c.fieldT = 0.25; }
    if (c.delay > 0) c.delay -= dt;
    else if (c.stun > 0) { c.stun -= dt; c.cron.setAlpha(0.5); }
    else {
      c.cron.setAlpha(1);
      const W = this.cols, tx = Math.floor(c.x / TILE), ty = Math.floor((c.y - 4) / TILE);
      let best = -1, bx = c.x, by = c.y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = tx + dx, ny = ty + dy, v = c.field[nx + ny * W];
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.rows || v < 0) continue;
        if (best < 0 || v < best) { best = v; bx = nx * TILE + TILE / 2; by = (ny + 1) * TILE - 4; }
      }
      const here = c.field[tx + ty * W];
      if (here === 0 || best < 0) { bx = L.x; by = L.y; }
      const sp = 138 * (GameState.equipped('acc_bell') ? 0.85 : 1) * dt;
      const dx = bx - c.x, dy = by - c.y, dd = Math.hypot(dx, dy) || 1;
      c.x += dx / dd * Math.min(sp, dd); c.y += dy / dd * Math.min(sp, dd);
      if (c.cron.anims && this.anims.exists('npc_cron-down')) { const k = `npc_cron-${Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')}`; if (c.cron.anims.currentAnim?.key !== k) c.cron.play(k); }
      c.cron.setPosition(c.x, c.y).setDepth(c.y);
      // 꽃등
      for (const l of c.lamps) {
        if (!GameState.flag(`chase.${l}`) || GameState.flag(`chase.${l}.used`)) continue;
        const t = this.things.find(x => x.def.id === l); if (!t) continue;
        if (Math.hypot(t.x - c.x, t.y - c.y) < 4 * TILE) { c.stun = 3.5; GameState.setFlag(`chase.${l}.used`); this.sparkle(t.x, t.y - 30, 0xffd66b); Audio.sfx('star'); }
      }
    }
    if (c.delay <= 0 && Math.hypot(c.x - L.x, c.y - L.y) < 20) {
      this.lock = true;
      await runDialogue('shadow_caught');
      GameState.spend(1, '크론에게 붙잡힘');
      L.x = c.start.x; L.y = c.start.y; this.hist = this.hist.map(() => ({ x: L.x, y: L.y, flip: false }));
      this.followers().forEach(a => { a.x = L.x; a.y = L.y; });
      c.x = c.start.x; c.y = c.start.y - 0; c.delay = 2.5; c.stun = 0; c.cron.setPosition(c.x, c.y);
      c.lamps.forEach(l => GameState.setFlag(`chase.${l}.used`, false));
      this.lock = false; return;
    }
    if (Math.hypot(c.goal.x - L.x, c.goal.y - L.y) < 30) {
      const win = c.onWin;
      this.tweens.add({ targets: c.cron, alpha: 0, duration: 600, onComplete: () => c.cron.destroy() });
      this.chaseState = null; GameState.setFlag('mode.chase', false); this.modeText.setVisible(false);
      this.refreshThings();
      this.runAct(win);
    }
  }

  // ---------- 메뉴: 동료 · 앨범 · 상점 ----------
  private showParty() {
    const d = GameState.data;
    const lines = CHAR_IDS.map(id => {
      const c = charById(id), b = d.bond[id] ?? 0, e = EPISODES.find(x => x.id === id)!;
      const ep = GameState.flag(`ep.${id}`) ? `「${e.title}」 완료` : episodeOpen(e) ? `「${e.title}」 열림 → ${regionName(e.map)}` : `에피소드: ${regionName(e.map)} 별 + 유대 3`;
      return `${c.name.padEnd(4, ' ')} ${'♥'.repeat(b)}${'♡'.repeat(5 - b)}  ${d.party.includes(id) ? ep : '(아직 못 찾음)'}`;
    });
    Bus.emit('menu', '동료 · 유대', [{ label: '닫기', act: () => {} }], lines.join('\n') + '\n\n유대는 같이 퍼즐을 풀거나, 쉬면서 대화하거나, 선택지로 오른다. 3이 되면 개인 에피소드가 열린다.');
  }
  private showAlbum() {
    const d = GameState.data;
    const lines = d.album.map(id => `■ ${regionName(id.split('_')[0])} — ${GameState.flag(`photo.${id}`) ?? id}`);
    Bus.emit('menu', `으네의 앨범 ${d.album.length}/36`, [{ label: '닫기', act: () => {} }], lines.length ? lines.join('\n') : '아직 찍은 사진이 없다. 으네로 촬영 지점에서 능력을 쓰자.');
  }
  private openShop(title: string) {
    const d = GameState.data;
    const opts: { label: string; act: () => void; icon?: string }[] = SHOP.filter(s => !(s.acc && GameState.item(s.k) > 0)).map(s => ({ icon: `item_${s.k}`, label: `${ITEM_NAMES[s.k].name} — 별조각 ${s.price}`, act: () => {
      if (GameState.item('starShard') < s.price) return toast('별조각이 모자라.');
      GameState.addItem('starShard', -s.price); GameState.addItem(s.k); Audio.sfx('get');
      toast(`${ITEM_NAMES[s.k].name}을(를) 샀다.${s.acc ? ' 가방에서 장착할 수 있어.' : ''}`);
    } }));
    opts.push({ label: '닫기', act: () => {} });
    Bus.emit('menu', title, opts, `가진 별조각: ${d.inventory.starShard ?? 0}\n별사탕: 설계자 권한 충전 · 차: 휴식 4시간 · 구름솜: 발판 2배\n액세서리 칸 ${GameState.equipSlots()}개`);
  }

  // ---------- 엔딩 ----------
  private goEnding(kind: 'reset' | 'normal' | 'true' | 'secret') {
    this.lock = true;
    Audio.bgm(null);
    const secret = kind === 'true' && countNotes(GameState.data.bugNotes) >= NOTE_TOTAL;
    this.cameras.main.fadeOut(1200, kind === 'reset' ? 0 : 255, kind === 'reset' ? 0 : 255, kind === 'reset' ? 0 : 255);
    this.cameras.main.once('camerafadeoutcomplete', async () => {
      if (!GameState.flag('preview')) { void Cloud.ending(kind, GameState.data.difficulty ?? 'normal', GameState.data.hoursLeft); }
      try { localStorage.setItem(`last-save:end-${kind}`, '1'); if (kind === 'reset') localStorage.setItem('last-save:loop', '1'); } catch { /* 저장소 없음 */ }
      if (secret) { GameState.setFlag('secret.mode'); GameState.setFlag('arrive.trash', false); }
      else await SaveManager.clear();
      this.scene.start('Ending', { kind, secret });
    });
  }


  // ---------- 길 안내 (다음 목표까지 경로 · 화살표 · 필요한 능력) ----------
  private guideG?: Phaser.GameObjects.Graphics;
  private guideT = 0;
  private guidePath: Pt[] = [];
  /** 경로 위 첫 능력 칸: 그 앞 칸(edge)에서 누구의 능력이 필요한지 */
  private guideNeed: { edge: Pt; tile: Pt; who: CharId } | null = null;
  private guideGoal: { x: number; y: number; label: string } | null = null;

  /** 처음 시작할 때 한 번: 어떻게 하는지 */
  private howTo() {
    GameState.setFlag('tut.howto');
    Bus.emit('menu', '이렇게 하면 돼요', [{ label: '알겠어!', act: () => {} }], [
      '① 왼쪽 위 ▶ 노란 글씨 = 지금 할 일',
      '② 바닥의 노란 점과 화살표를 따라 걸어가요',
      '③ 사람·물건 앞에서 Space (모바일 A)',
      '    필요한 동료의 능력은 알아서 바꿔서 써 줘요',
      '④ 민트색 칸이 보이면 그 위에서 Space',
      '    → 구름 발판·바위 부수기 같은 능력이 나가요',
      '⑤ 막히면 Esc(≡) → 힌트 · 숫자 1~9로 직접 교체도 가능',
    ].join('\n'));
  }
  /** 테스트·디버그용 */
  get guideInfo() { return { goal: this.guideGoal, path: this.guidePath, need: this.guideNeed }; }
  /** 지금 가야 할 곳 (월드 좌표) */
  private guideTarget(): { x: number; y: number; label: string } | null {
    if (this.preview || this.chaseState || this.raceState) return null;
    const L = this.lead, d = GameState.data;
    const nearest = <T extends { x: number; y: number }>(a: T[]) => a.sort((p, q) => Math.hypot(p.x - L.x, p.y - L.y) - Math.hypot(q.x - L.x, q.y - L.y))[0];
    const station = () => {
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (this.grid[y][x] === 'S') return { x: x * TILE + 12, y: y * TILE + 20, label: '하늘 정류장 — 다음 지역으로' };
      return null;
    };
    if (!this.region) {
      if (this.mapId !== 'cloud') return null;
      if (!GameState.flag('mq.gather')) {
        const n = nearest(this.npcs.slice());
        return n ? { x: n.x, y: n.y, label: `${charById(n.id).name} 찾기 (${d.party.length}/9)` } : null;
      }
      if (!GameState.flag('mq.cloud')) {
        if (GameState.item('towerPieces') >= 3) { const f = feetOf(TOWER_SPOT); return { x: f.x, y: f.y, label: '무너진 시계탑에 별 조각 맞추기' }; }
        const pc = nearest(this.pickups.filter(p => p.kind === 'piece' && p.spr.visible).map(p => ({ x: p.spr.x, y: p.spr.y + 10 })));
        return pc ? { ...pc, label: `시계탑 별 조각 줍기 (${GameState.item('towerPieces')}/3)` } : null;
      }
      return station();
    }
    // 이 지역 별(메인 퀘스트)을 켰으면 다음 지역으로. 서브 퀘스트(!)는 선택
    if (this.mapId === 'shadow' && !GameState.flag('mq.shadow') && d.leader !== 'shiro' && d.party.includes('shiro'))
      return { x: L.x, y: L.y, label: '너무 어두워! 시로(9)를 앞장세우면 길과 고양이가 보인다' };
    const ep = this.things.find(t => t.spr.visible && t.mark.visible && t.mark.text === '♥');
    if (GameState.flag(MQ_OF[this.mapId] ?? '-') && ep) return { x: ep.x, y: ep.y, label: `♥ ${t2s(ep.def.label) || '개인 에피소드'} (트루 엔딩에 필요)` };
    if (GameState.flag(MQ_OF[this.mapId] ?? '-') && this.mapId !== 'lastsave') {
      const st = station(); if (st) return { ...st, label: '이 지역 별 완료! 하늘 정류장 → 다음 지역 (! 표시는 선택 퀘스트)' };
    }
    const rank = (m: string) => (m === '!' || m === '✦' ? 0 : m === '?' ? 1 : m === '♥' ? 3 : 9);
    const cands: { x: number; y: number; label: string; r: number }[] = [];
    for (const t of this.things) {
      if (!t.spr.visible || !t.mark.visible) continue;
      const r = rank(t.mark.text); if (r < 9) cands.push({ x: t.x, y: t.y, label: t.tag.text || (typeof t.def.label === 'function' ? t.def.label() : t.def.label) || '조사하기', r });
    }
    for (const f of this.folks) {
      if (!f.spr.visible || !f.mark.visible) continue;
      const r = rank(f.mark.text); if (r < 9) cands.push({ x: f.x, y: f.y, label: `${f.tag.text || '주민'}에게 말 걸기`, r: MAIN_FOLK[this.mapId] === f.id ? -1 : r + 0.5 });
    }
    if (cands.length) {
      const best = Math.min(...cands.map(c => c.r));
      const c = nearest(cands.filter(x => x.r === best));
      return { x: c.x, y: c.y, label: c.label };
    }
    return station();
  }

  /** 걷기(비용 1) + 능력 칸(비용 25)으로 최단 경로 */
  private guideRoute(goal: { x: number; y: number }) {
    const W = this.cols, H = this.rows, L = this.lead;
    const sx = Math.floor(L.x / TILE), sy = Math.floor((L.y - 4) / TILE);
    const gx = Math.floor(goal.x / TILE), gy = Math.floor((goal.y - 4) / TILE);
    const party = GameState.data.party;
    const abil = (t: string): CharId | null =>
      t === ' ' ? (party.includes('rumung') ? 'rumung' : null) : t === 'X' ? (party.includes('dotcha') ? 'dotcha' : null)
      : t === 'V' ? (party.includes('haming') ? 'haming' : null) : t === 'g' ? (party.includes('shiro') ? 'shiro' : null) : null;
    const cost = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    const heap: [number, number][] = [];
    const push = (c: number, i: number) => { heap.push([c, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const exact = !this.blocked(this.grid[gy]?.[gx] ?? '#');
    const si = sy * W + sx; cost[si] = 0; push(0, si);
    let end = -1;
    while (heap.length) {
      const [c, i] = pop(); if (c > cost[i]) continue;
      const x = i % W, y = (i / W) | 0;
      if (Math.abs(x - gx) + Math.abs(y - gy) <= (exact ? 0 : 1)) { end = i; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const t = this.grid[ny][nx], ni = ny * W + nx;
        let w = 1;
        if (this.blocked(t) && !this.bridges.has(key(nx, ny))) { if (!abil(t)) continue; w = 25; }
        if (c + w < cost[ni]) { cost[ni] = c + w; prev[ni] = i; push(c + w, ni); }
      }
    }
    const path: Pt[] = [];
    for (let i = end; i >= 0; i = prev[i]) path.push({ x: i % W, y: (i / W) | 0 });
    path.reverse();
    let need: { edge: Pt; tile: Pt; who: CharId } | null = null;
    for (let k = 1; k < path.length; k++) {
      const t = this.grid[path[k].y][path[k].x];
      if (this.blocked(t) && !this.bridges.has(key(path[k].x, path[k].y))) { need = { edge: path[k - 1], tile: path[k], who: abil(t)! }; break; }
    }
    return { path, need };
  }

  private updateGuide(dt: number) {
    this.guideT -= dt;
    if (this.guideT > 0) return;
    this.guideT = 0.35;
    if (!this.guideG) this.guideG = this.add.graphics().setDepth(8500);
    const g = this.guideG; g.clear();
    const goal = this.guideTarget();
    this.guideGoal = goal;
    if (!goal || GameState.flag('opt.noguide')) { this.guidePath = []; this.guideNeed = null; Bus.emit('guide', null); return; }
    const { path, need } = this.guideRoute(goal);
    this.guidePath = path; this.guideNeed = need;
    // 바닥에 발자국 점 (가까운 14칸)
    const until = need ? path.findIndex(p => p.x === need.edge.x && p.y === need.edge.y) + 1 : path.length;
    const pulse = (this.time.now / 350) % 1;
    for (let k = 2; k < Math.min(until, 16); k += 2) {
      const p = path[k], a = 0.95 - k * 0.04, r = k % 4 === Math.floor(pulse * 4) % 4 ? 6 : 5;
      g.fillStyle(0x160f33, a * 0.6).fillCircle(p.x * TILE + 12, p.y * TILE + 15, r + 2);
      g.fillStyle(0xffd66b, a).fillCircle(p.x * TILE + 12, p.y * TILE + 14, r);
    }
    if (need) { const e = need.edge, t = need.tile; g.fillStyle(0x7cf0c8, 0.28).fillRect(e.x * TILE, e.y * TILE, TILE, TILE).lineStyle(2, 0x7cf0c8, 1).strokeRect(e.x * TILE + 1, e.y * TILE + 1, TILE - 2, TILE - 2);
      g.fillStyle(0x7cf0c8, 0.9).fillTriangle(t.x * TILE + 12 + (t.x - e.x) * 6, t.y * TILE + 12 + (t.y - e.y) * 6, t.x * TILE + 12 - (t.y - e.y) * 6, t.y * TILE + 12 - (t.x - e.x) * 6, t.x * TILE + 12 + (t.y - e.y) * 6, t.y * TILE + 12 + (t.x - e.x) * 6); }
    // 화살표가 가리킬 곳: 능력이 필요하면 그 앞 칸, 아니면 목표
    const aim = need ? { x: need.edge.x * TILE + 12, y: need.edge.y * TILE + 12 } : goal;
    const cam = this.cameras.main, z = cam.zoom;
    const sx = (aim.x - cam.worldView.x) * z, sy = (aim.y - cam.worldView.y) * z;
    const lx = (this.lead.x - cam.worldView.x) * z, ly = (this.lead.y - 20 - cam.worldView.y) * z;
    const c = need ? charById(need.who) : null;
    const tip = need ? `${c!.name}(${CHAR_IDS.indexOf(need.who) + 1})의 ${c!.ability} — 표시된 칸에서 Space` : '';
    Bus.emit('guide', { sx, sy, lx, ly, lift: need ? 30 : 74, label: goal.label, tip, far: Math.hypot(aim.x - this.lead.x, aim.y - this.lead.y) > 90 });
  }

  /** Space 한 번으로: 필요한 동료로 바꾸고 능력까지 쓴다 */
  private autoAbility(): boolean {
    const L = this.lead, d = GameState.data;
    const tx = Math.floor(L.x / TILE), ty = Math.floor((L.y - 4) / TILE);
    const use = (who: CharId, dir?: { x: number; y: number }) => {
      if (!d.party.includes(who)) return false;
      if (d.leader !== who) { this.switchTo(who); if (d.leader !== who) return true; }
      if (dir) this.face = dir;
      const nt = Math.floor(this.lead.x / TILE), nty = Math.floor((this.lead.y - 4) / TILE);
      if (who === 'rumung') this.cloudStep(nt, nty);
      else if (who === 'dotcha') this.dash(nt, nty);
      else if (who === 'haming') this.bloom(nt, nty);
      else if (who === 'shiro') toast('시로가 앞장섰다. 좁은 틈으로 걸어 들어가자.');
      return true;
    };
    // 길 안내가 표시한 칸 위(또는 바로 옆)에 서 있으면
    const n = this.guideNeed;
    if (n && Math.abs(n.edge.x - tx) + Math.abs(n.edge.y - ty) <= 1) return use(n.who, { x: Math.sign(n.tile.x - n.edge.x), y: Math.sign(n.tile.y - n.edge.y) });
    // 바라보는 칸
    const fx = tx + this.face.x, fy = ty + this.face.y, ft = this.grid[fy]?.[fx];
    if (ft === 'X') return use('dotcha');
    if (ft === 'V') return use('haming');
    if (ft === 'g') return use('shiro');
    return false;
  }

  // ---------- 루프 ----------
  update(_t: number, dms: number) {
    if (!this.live) return;
    const dt = Math.min(0.05, dms / 1000);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.boost = Math.max(0, this.boost - dt);

    const busy = UIState.busy || this.lock;
    const L = this.lead;
    this.updateGuide(dt);
    let moving = false;
    if (!busy) {
      if (Input.take('menu')) this.openMainMenu();
      if (Input.take('quest')) this.showQuests();
      if (Input.take('bag')) this.showBag();
      if (Input.take('map')) this.showMap(false);
      for (let n = 1; n <= 9; n++) if (Input.take(`num${n}` as any)) this.switchTo(CHAR_IDS[n - 1]);
      if (Input.take('switch')) this.cycle();
      if (Input.take('ability')) this.useAbility();
      if (Input.take('confirm')) this.interact();

      const ax0 = Input.axis(); const ax = this.mirrored ? { x: -ax0.x, y: ax0.y } : ax0;
      if (ax.x || ax.y) {
        moving = true;
        const sp = (Input.running() ? RUN : SPEED) * ((window as any).__DEBUG ? (window as any).__SPEED ?? 1 : 1) * (GameState.equipped('acc_feather') ? 1.1 : 1) * (this.boost > 0 ? 1.7 : 1);
        const nx = L.x + ax.x * sp * dt, ny = L.y + ax.y * sp * dt;
        const mx = this.boxFree(nx, L.y), my = this.boxFree(L.x, ny);
        if (mx) L.x = nx;
        if (my) L.y = ny;
        // 모서리에 걸리면 길 가운데 쪽으로 살짝 밀어 준다
        if (!mx && ax.x && Math.abs(ax.y) < 0.3) for (const off of [6, -6, 12, -12]) if (this.boxFree(nx, L.y + off)) { L.y += Math.sign(off) * Math.min(2, Math.abs(off)); break; }
        if (!my && ax.y && Math.abs(ax.x) < 0.3) for (const off of [6, -6, 12, -12]) if (this.boxFree(L.x + off, ny)) { L.x += Math.sign(off) * Math.min(2, Math.abs(off)); break; }
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
    for (const p of [...this.pickups]) if (Math.hypot(p.spr.x - L.x, p.spr.y - (L.y - 8)) < 28) {
      GameState.data.picked.push(p.id); p.spr.destroy(); this.pickups = this.pickups.filter(x => x !== p);
      Audio.sfx('get');
      if (p.kind === 'piece') { GameState.addItem('towerPieces'); const n = GameState.item('towerPieces'); toast(n >= 3 ? '시계탑 별 조각을 모두 모았다! 무너진 시계탑으로 가자.' : `시계탑 별 조각을 주웠다. (${n}/3)`); }
      else { GameState.addItem('letters'); const n = GameState.item('letters'); toast(n >= 5 ? '편지를 다 모았다! 피코에게 돌아가자.' : `날아간 편지를 주웠다. (${n}/5)`); }
      this.refreshFolkMarks();
    }
    // 동쪽 섬 힌트 (한 번)
    if (!this.region && !GameState.flag('hint.island') && Math.hypot(L.x - feetOf(HINT_SPOT).x, L.y - feetOf(HINT_SPOT).y) < 80) {
      GameState.setFlag('hint.island');
      toast(GameState.inParty('rumung') ? '건너편 섬에 누가 보인다. 루뭉의 구름 걸음이라면…' : '건너편 섬에 누가 보인다. 하늘 위를 걸을 방법이 있다면…');
    }
    // 근처 대상 강조
    const nearN = this.npcs.find(n => Math.hypot(n.x - L.x, n.y - L.y) < 46);
    this.npcs.forEach(n => n.bubble.setScale(n === nearN ? 1.25 : 1));
    this.updateThings(busy);
    if (this.raceState && !busy) this.updateRace(dt);
    if (this.chaseState && !busy) this.updateChase(dt);
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
