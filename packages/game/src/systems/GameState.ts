// 현재 플레이 상태와 씬 간 이벤트 버스
import Phaser from 'phaser';
import { newSave, SaveManager, type SaveData } from './SaveManager';
import { Story1 } from './StoryRunner';
import { charById, CHAR_IDS, type CharId } from '../data/characters';

export const Bus = new Phaser.Events.EventEmitter();

class GameStateImpl {
  data: SaveData = newSave('rumung');

  startNew(first: CharId) {
    this.data = newSave(first);
    Story1.story.ResetState();
    Story1.setPlayer(first, charById(first).name);
    try { Story1.story.variablesState['loop'] = localStorage.getItem('last-save:loop') === '1'; } catch { /* 저장소 없음 */ }
  }

  loadFrom(d: SaveData) {
    // 이전 버전 세이브 보정
    this.data = { ...newSave(d.firstPlayer), ...d };
    this.data.inventory ??= { starShard: 0 }; this.data.bond ??= {}; this.data.picked ??= []; this.data.memories ??= { world: 0, core: [] }; this.data.memories.core ??= []; this.data.album ??= []; this.data.equip ??= [];
    Story1.story.ResetState();
    if (d.inkState) Story1.loadState(d.inkState);
    Story1.setPlayer(d.firstPlayer, charById(d.firstPlayer).name);
  }

  async save(): Promise<import('./SaveManager').SaveResult> {
    this.data.inkState = Story1.saveState();
    return SaveManager.save(this.data);
  }

  /** 맵 둘러보기: 9명 모두 합류, 시간·저장 없음 */
  startPreview() {
    this.startNew('rumung');
    this.data.party = [...CHAR_IDS];
    Object.assign(this.data.flags, { preview: true, 'mq.gather': true, 'mq.cloud': true });
  }

  get leader() { return this.data.leader; }

  /** 72시간 타이머 소모. 0이 되면 초기화 엔딩 */
  spend(hours: number, reason: string) {
    if (this.data.flags.preview) return;
    if (this.data.difficulty === 'easy') hours = hours / 2;
    this.data.hoursLeft = Math.max(0, this.data.hoursLeft - hours);
    Bus.emit('hud-refresh');
    Bus.emit('time-spent', hours, reason);
    if (this.data.hoursLeft <= 0) Bus.emit('time-up');
  }
  addItem(k: string, n = 1) { this.data.inventory[k] = (this.data.inventory[k] ?? 0) + n; Bus.emit('hud-refresh'); if (n > 0) Bus.emit('item-get', k, n); }
  item(k: string) { return this.data.inventory[k] ?? 0; }
  addBond(id: string, n = 1) { this.data.bond[id] = Math.min(5, (this.data.bond[id] ?? 0) + n); }
  inParty(id: CharId) { return this.data.party.includes(id); }
  flag(k: string) { return this.data.flags[k]; }
  /** 세계 기억 n번째를 되찾았다 */
  world(n: number) { this.data.memories.world = Math.max(this.data.memories.world, n); Bus.emit('hud-refresh'); }
  /** 빅윈 설계자 권한 최대 충전 수: 기억을 되찾을수록 늘어난다 */
  bwMax() {
    if (this.flag('choice.shadow') === 'hold' && !this.flag('mq.final')) return 1;
    return 1 + Math.floor(this.data.memories.world / 2) + (this.flag('mq.shadow') ? 2 : 0);
  }
  bwCharges() { const v = this.flag('bw.charge'); return typeof v === 'number' ? v : this.bwMax(); }
  setBw(n: number) { this.setFlag('bw.charge', Math.max(0, n)); Bus.emit('hud-refresh'); }
  equipped(k: string) { return this.data.equip.includes(k); }
  equipSlots() { return 1 + (this.flag('sq.04') ? 1 : 0); }
  setFlag(k: string, v: boolean | string | number = true) { this.data.flags[k] = v; }
}

export const GameState = new GameStateImpl();
