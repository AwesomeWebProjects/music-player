import { LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { PlayerController, formatTime } from '@awesome-web-projects/audio-engine';
import type { Track } from '@awesome-web-projects/audio-engine';

export class BasePlayer extends LitElement {
  @property({ type: Array })
  tracks: Track[] = [];

  @property()
  color = 'rgba(97, 218, 251, 0.8)';

  @property({ attribute: 'initial-volume', type: Number })
  initialVolume = 0.5;

  @property()
  thread: 'main' | 'worker' = 'worker';

  @property({ attribute: 'enable-keyboard' })
  enableKeyboard = 'true';

  @state() protected _isPlaying = false;
  @state() protected _isLoading = false;
  @state() protected _isFullSong = false;
  @state() protected _currentTrack: Track | undefined;
  @state() protected _formattedTime = '00:00';
  @state() protected _volume = 0.5;
  @state() protected _volumeOpen = false;
  @state() protected _progress = 0;

  protected controller!: PlayerController;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._volume = this.initialVolume;
    this.controller = new PlayerController({
      tracks: this.tracks,
      thread: this.thread as 'main' | 'worker',
      initialVolume: this.initialVolume,
      workerURL: new URL('../worker/audio-worker.ts', import.meta.url),
    });
    this._currentTrack = this.controller.currentTrack;
    this._bindControllerEvents();
    this._setupKeyboard();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
    }
    this.controller?.dispose();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('tracks') && this.controller) {
      this.controller.setTracks(this.tracks);
      this._currentTrack = this.controller.currentTrack;
    }
  }

  private _bindControllerEvents(): void {
    this.controller.on('play', () => {
      this._isPlaying = true;
      this._isLoading = false;
    });
    this.controller.on('pause', () => {
      this._isPlaying = false;
    });
    this.controller.on('loading', (isLoading) => {
      this._isLoading = isLoading;
    });
    this.controller.on('trackchange', (track) => {
      this._currentTrack = track;
      this._isFullSong = false;
      this._progress = 0;
    });
    this.controller.on('timeupdate', (ct) => {
      this._formattedTime = formatTime(ct);
      this._progress = this.controller.getProgress();
    });
    this.controller.on('volumechange', (v) => {
      this._volume = v;
    });
    this.controller.on('fullsongloaded', () => {
      this._isFullSong = true;
    });
  }

  private _setupKeyboard(): void {
    if (this.enableKeyboard === 'false') return;
    this._keydownHandler = (e: KeyboardEvent) => {
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
    document.addEventListener('keydown', this._keydownHandler);
  }

  protected _toggleVolume(): void {
    this._volumeOpen = !this._volumeOpen;
  }

  protected _handleVolumeMousedown(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    const apply = (ev: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
      this.controller.setVolume(x / rect.width);
    };
    apply(e);
    const onMove = (ev: MouseEvent) => apply(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  protected _handleProgressMousedown(e: MouseEvent): void {
    if (!this._isFullSong) return;
    const el = e.currentTarget as HTMLElement;
    const apply = (ev: MouseEvent) => {
      if (!this._isFullSong) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
      this.controller.seek(x / rect.width);
    };
    apply(e);
    const onMove = (ev: MouseEvent) => apply(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
}