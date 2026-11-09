// 현재 플레이 상태와 씬 간 이벤트 버스
import Phaser from 'phaser';
import { newSave, SaveManager, type SaveData } from './SaveManager';
import { Story1 } from './StoryRunner';
import { charById, type CharId } from '../data/characters';

export const Bus = new Phaser.Events.EventEmitter();

class GameStateImpl {
  data: SaveData = newSave('rumung');

  startNew(first: CharId) {
    this.data = newSave(first);
    Story1.story.ResetState();
    Story1.setPlayer(first, charById(first).name);
  }

  loadFrom(d: SaveData) {
    // 이전 버전 세이브 보정
    this.data = { ...newSave(d.firstPlayer), ...d };
    this.data.inventory ??= { starShard: 0 }; this.data.bond ??= {}; this.data.picked ??= []; this.data.memories ??= { world: 0, core: [] };
    Story1.story.ResetState();
    if (d.inkState) Story1.loadState(d.inkState);
    Story1.setPlayer(d.firstPlayer, charById(d.firstPlayer).name);
  }

  async save(): Promise<boolean> {
    this.data.inkState = Story1.saveState();
    return SaveManager.save(this.data);
  }

  get leader() { return this.data.leader; }

  /** 72시간 타이머 소모. 0이 되면 초기화 엔딩 */
  spend(hours: number, reason: string) {
    this.data.hoursLeft = Math.max(0, this.data.hoursLeft - hours);
    Bus.emit('hud-refresh');
    Bus.emit('time-spent', hours, reason);
    if (this.data.hoursLeft <= 0) Bus.emit('time-up');
  }
  addItem(k: string, n = 1) { this.data.inventory[k] = (this.data.inventory[k] ?? 0) + n; Bus.emit('hud-refresh'); }
  item(k: string) { return this.data.inventory[k] ?? 0; }
  addBond(id: string, n = 1) { this.data.bond[id] = Math.min(5, (this.data.bond[id] ?? 0) + n); }
  inParty(id: CharId) { return this.data.party.includes(id); }
  flag(k: string) { return this.data.flags[k]; }
  setFlag(k: string, v: boolean | string | number = true) { this.data.flags[k] = v; }
}

export const GameState = new GameStateImpl();
