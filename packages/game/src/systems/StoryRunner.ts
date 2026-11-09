// Ink 원고 실행기. 대사 줄을 화자/내용/태그로 쪼개서 넘겨준다.
import { Story } from 'inkjs/dist/ink-es6.js'; // 런타임 전용 ES 모듈 (컴파일러 제외)
import storyJson from '../story/main.ink';

export interface Line { speaker: string; text: string; tags: string[] }
export interface Choice { index: number; text: string }

export class StoryRunner {
  story = new Story(storyJson as any);

  setPlayer(id: string, name: string) {
    this.story.variablesState['me_id'] = id;
    this.story.variablesState['me_name'] = name;
  }
  saveState(): string { return this.story.state.ToJson(); }
  loadState(json: string) { try { this.story.state.LoadJson(json); } catch { /* 이전 버전 세이브 */ } }

  go(knot: string) { this.story.ChoosePathString(knot); }

  next(): Line | null {
    while (this.story.canContinue) {
      const raw = (this.story.Continue() ?? '').trim();
      if (!raw) continue;
      const tags = (this.story.currentTags ?? []).map(t => t.trim());
      const m = raw.match(/^([a-z0-9_]+):\s*(.*)$/);
      return m ? { speaker: m[1], text: m[2], tags } : { speaker: 'narr', text: raw, tags };
    }
    return null;
  }
  choices(): Choice[] { return this.story.currentChoices.map(c => ({ index: c.index, text: c.text })); }
  choose(i: number) { this.story.ChooseChoiceIndex(i); }
  getVar(name: string) { return this.story.variablesState[name]; }
}

export const Story1 = new StoryRunner();
