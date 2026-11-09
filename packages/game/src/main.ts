import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SelectScene } from './scenes/SelectScene';
import { PrologueScene } from './scenes/PrologueScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { EndingScene } from './scenes/EndingScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { Input } from './systems/InputManager';
import { isTouchDevice, mountTouchPad } from './ui/TouchPad';
import { mountPcFullscreen } from './ui/fullscreen';
import { GameState } from './systems/GameState';

/** 사이트에서 호출하는 진입점. parent 안에 게임을, touchRoot 안에 모바일 버튼을 붙인다. */
export function startGame(parent: HTMLElement, touchRoot?: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#0c0920',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, SelectScene, PrologueScene, WorldScene, EndingScene, UIScene, PuzzleScene],
  });
  game.events.on(Phaser.Core.Events.POST_STEP, () => Input.endFrame());
  (window as any).__LS = game; // 개발용 디버그 핸들
  (window as any).__IN = Input;
  (window as any).__GS = GameState;
  if (touchRoot) {
    if (isTouchDevice()) { mountTouchPad(touchRoot); document.body.classList.add('touch'); }
    else touchRoot.remove();
  }
  if (!isTouchDevice()) mountPcFullscreen(document.getElementById('app') ?? parent);
  return game;
}

const parent = document.getElementById('game');
if (parent) startGame(parent, document.getElementById('touch') ?? undefined);
