import { sfx } from './core/audio';
import { Background } from './gfx/background';

export interface PEvent { type: 'down' | 'move' | 'up'; x: number; y: number; id: number }

export interface Scene {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  pointer?(e: PEvent): void;
  resize?(): void;
  exit?(): void;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ui: HTMLElement;
  W = 0;
  H = 0;
  dpr = 1;
  safe = { t: 0, r: 0, b: 0, l: 0 };
  scene: Scene | null = null;
  bg = new Background();
  private last = 0;
  private probe: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ui = document.getElementById('ui')!;
    this.probe = document.getElementById('safe')!;
    addEventListener('resize', () => this.resize());
    const send = (type: PEvent['type']) => (e: PointerEvent) => {
      if (type === 'down') this.canvas.setPointerCapture?.(e.pointerId);
      this.scene?.pointer?.({ type, x: e.clientX, y: e.clientY, id: e.pointerId });
    };
    this.canvas.addEventListener('pointerdown', send('down'));
    this.canvas.addEventListener('pointermove', send('move'));
    this.canvas.addEventListener('pointerup', send('up'));
    this.canvas.addEventListener('pointercancel', send('up'));
    document.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
    this.resize();
    requestAnimationFrame(this.loop);
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    const cs = getComputedStyle(this.probe);
    this.safe = {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0,
    };
    this.scene?.resize?.();
  }

  private loop = (ts: number) => {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    if (this.W !== window.innerWidth || this.H !== window.innerHeight) this.resize();
    this.bg.update(dt);
    this.scene?.update(dt);
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bg.render(c, this.W, this.H);
    this.scene?.render(c);
    requestAnimationFrame(this.loop);
  };

  setScene(s: Scene) {
    this.scene?.exit?.();
    this.scene = s;
    s.resize?.();
  }

  async fade(out: boolean) {
    const f = document.getElementById('fade')!;
    f.style.opacity = out ? '1' : '0';
    await sleep(300);
  }
}

export let app: App;
export function initApp() {
  app = new App();
  return app;
}
