import { PlayerController } from '@awesome-web-projects/audio-engine';
import type { Track } from '@awesome-web-projects/audio-engine';

export abstract class BasePlayer extends HTMLElement {
  protected controller!: PlayerController;
  protected shadow: ShadowRoot;
  protected _tracks: Track[] = [];
  protected _color = 'rgba(97, 218, 251, 0.8)';
  private _connected = false;

  static get observedAttributes(): string[] {
    return ['color', 'initial-volume', 'thread', 'enable-keyboard'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  // --- Properties ---

  set tracks(value: Track[]) {
    this._tracks = value;
    if (this._connected) {
      this.controller.setTracks(value);
    }
  }

  get tracks(): Track[] {
    return this._tracks;
  }

  // --- Lifecycle ---

  connectedCallback(): void {
    this._connected = true;
    const initialVolume = parseFloat(this.getAttribute('initial-volume') ?? '0.5');
    const thread = (this.getAttribute('thread') as 'main' | 'worker') ?? 'worker';
    this._color = this.getAttribute('color') ?? this._color;

    this.controller = new PlayerController({
      tracks: this._tracks,
      thread,
      initialVolume,
      workerURL: new URL('../worker/audio-worker.ts', import.meta.url),
    });

    this.render();
    this.bindEvents();
    this.setupKeyboard();
  }

  disconnectedCallback(): void {
    this._connected = false;
    this.controller?.dispose();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this._connected) return;

    switch (name) {
      case 'color':
        this._color = value ?? 'rgba(97, 218, 251, 0.8)';
        this.onColorChange();
        break;
      case 'initial-volume':
        if (value) this.controller.setVolume(parseFloat(value));
        break;
    }
  }

  // --- Abstract methods ---

  protected abstract render(): void;
  protected abstract bindEvents(): void;
  protected abstract onColorChange(): void;

  // --- Shared helpers ---

  protected setupKeyboard(): void {
    const enabled = this.getAttribute('enable-keyboard') !== 'false';
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.controller.togglePlay();
          break;
        case 'KeyN':
          this.controller.next();
          break;
        case 'KeyB':
          this.controller.prev();
          break;
      }
    };

    document.addEventListener('keydown', handler);
  }

  protected el<T extends HTMLElement>(selector: string): T {
    return this.shadow.querySelector(selector) as T;
  }

  protected els<T extends HTMLElement>(selector: string): NodeListOf<T> {
    return this.shadow.querySelectorAll(selector);
  }
}