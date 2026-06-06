import { formatTime } from '@awesome-web-projects/audio-engine';
import { BasePlayer } from '../../shared/base-player';
import {
  playIcon,
  pauseIcon,
  skipForwardIcon,
  skipBackIcon,
  volumeIcon,
  loaderIcon,
} from '../../shared/icons';
import { glassStyles } from './glass-styles';
import { startGlassVisualizer } from './glass-visualizer';

const WHITE = 'rgba(255, 255, 255, 0.8)';
const WHITE_BRIGHT = 'rgba(255, 255, 255, 0.9)';

export class GlassPlayerElement extends BasePlayer {
  private progressRaf: number | null = null;
  private volumeOpen = false;
  private dragging = false;
  private volumeDragging = false;
  private visualizer: ReturnType<typeof startGlassVisualizer> | null = null;

  protected render(): void {
    const color = this._color;
    const track = this.controller.currentTrack;

    this.shadow.innerHTML = `
      <style>${glassStyles}</style>
      <div class="glass">
        <canvas class="canvas" data-el="canvas"></canvas>
        <div class="overlay">
          <div class="info">
            <div class="artist" data-el="artist">${track?.artist ?? ''}</div>
            <div class="name" data-el="name">${track?.name ?? ''}</div>
          </div>
          <div class="controls">
            <button class="btn" data-action="prev" aria-label="Previous">${skipBackIcon(20, WHITE_BRIGHT)}</button>
            <button class="play-btn" data-action="toggle" aria-label="Play">
              ${playIcon(24, WHITE_BRIGHT)}
            </button>
            <button class="btn" data-action="next" aria-label="Next">${skipForwardIcon(20, WHITE_BRIGHT)}</button>
          </div>
          <div class="progress-track" data-el="progress-track">
            <div class="progress-fill" data-el="progress-fill" style="background-color: ${color}"></div>
          </div>
          <div class="bottom-row">
            <span class="time" data-el="time">00:00</span>
            <div class="volume-area" data-el="volume-area">
              <button class="btn" data-action="volume-toggle" aria-label="Volume">${volumeIcon(0.5, 18, WHITE)}</button>
              <div class="volume-slider" data-el="volume-slider" style="display:none">
                <div class="volume-track" data-el="volume-track">
                  <div class="volume-fill" data-el="volume-fill" style="width:50%;background-color:${color}"></div>
                  <div class="volume-thumb" data-el="volume-thumb" style="left:50%;background-color:${color}"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected bindEvents(): void {
    // Button clicks via event delegation
    this.shadow.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      switch (target.dataset.action) {
        case 'prev': this.controller.prev(); break;
        case 'next': this.controller.next(); break;
        case 'toggle': this.controller.togglePlay(); break;
        case 'volume-toggle':
          this.volumeOpen = !this.volumeOpen;
          this.el('[data-el="volume-slider"]').style.display = this.volumeOpen ? '' : 'none';
          break;
      }
    });

    // Progress seek
    const progressTrack = this.el<HTMLDivElement>('[data-el="progress-track"]');
    progressTrack.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.applySeek(e);
    });

    // Volume drag
    const volumeTrack = this.el<HTMLDivElement>('[data-el="volume-track"]');
    volumeTrack.addEventListener('mousedown', (e) => {
      this.volumeDragging = true;
      this.applyVolume(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.dragging) this.applySeek(e);
      if (this.volumeDragging) this.applyVolume(e);
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
      this.volumeDragging = false;
    });

    // Controller events
    this.controller.on('play', () => {
      this.updatePlayButton();
      this.visualizer?.update({ isPlaying: true });
    });
    this.controller.on('pause', () => {
      this.updatePlayButton();
      this.visualizer?.update({ isPlaying: false });
    });
    this.controller.on('loading', () => this.updatePlayButton());
    this.controller.on('trackchange', (track) => {
      this.el('[data-el="artist"]').textContent = track.artist;
      this.el('[data-el="name"]').textContent = track.name;
    });
    this.controller.on('timeupdate', (ct) => {
      this.el('[data-el="time"]').textContent = formatTime(ct);
    });
    this.controller.on('volumechange', (v) => this.updateVolumeUI(v));
    this.controller.on('fullsongloaded', () => this.removeShimmer());

    // Start visualizer
    this.initVisualizer();

    // Progress bar animation
    this.startProgressLoop();
  }

  private initVisualizer(): void {
    const canvas = this.el<HTMLCanvasElement>('[data-el="canvas"]');
    this.visualizer = startGlassVisualizer(
      canvas,
      this.controller.analyserNode,
      this.controller.frequencyData,
      {
        color: this._color,
        enabled: true,
        isPlaying: this.controller.isPlaying,
      },
    );
  }

  private startProgressLoop(): void {
    const fill = this.el<HTMLDivElement>('[data-el="progress-fill"]');
    const tick = () => {
      if (this.controller.isFullSong) {
        fill.style.width = `${this.controller.getProgress() * 100}%`;
      } else {
        fill.style.width = '0%';
      }
      this.progressRaf = requestAnimationFrame(tick);
    };
    this.progressRaf = requestAnimationFrame(tick);
  }

  private applySeek(e: MouseEvent): void {
    if (!this.controller.isFullSong) return;
    const track = this.el<HTMLDivElement>('[data-el="progress-track"]');
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    this.controller.seek(x / rect.width);
  }

  private applyVolume(e: MouseEvent): void {
    const track = this.el<HTMLDivElement>('[data-el="volume-track"]');
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    this.controller.setVolume(x / rect.width);
  }

  private updatePlayButton(): void {
    const btn = this.el<HTMLButtonElement>('[data-action="toggle"]');
    if (this.controller.isLoading) {
      btn.innerHTML = `<span class="spin">${loaderIcon(24, WHITE_BRIGHT)}</span>`;
    } else if (this.controller.isPlaying) {
      btn.innerHTML = pauseIcon(24, WHITE_BRIGHT);
      btn.setAttribute('aria-label', 'Pause');
      this.addShimmer();
    } else {
      btn.innerHTML = playIcon(24, WHITE_BRIGHT);
      btn.setAttribute('aria-label', 'Play');
    }
  }

  private updateVolumeUI(v: number): void {
    const fill = this.el<HTMLDivElement>('[data-el="volume-fill"]');
    const thumb = this.el<HTMLDivElement>('[data-el="volume-thumb"]');
    const btn = this.el<HTMLButtonElement>('[data-action="volume-toggle"]');
    fill.style.width = `${v * 100}%`;
    thumb.style.left = `${v * 100}%`;
    btn.innerHTML = volumeIcon(v, 18, WHITE);
    btn.setAttribute('aria-label', `Volume: ${Math.round(v * 100)}%`);
  }

  private addShimmer(): void {
    if (this.controller.isFullSong) return;
    const track = this.el<HTMLDivElement>('[data-el="progress-track"]');
    if (!track.querySelector('.progress-shimmer')) {
      const shimmer = document.createElement('div');
      shimmer.className = 'progress-shimmer';
      shimmer.style.background = `linear-gradient(90deg, transparent, ${this._color}, transparent)`;
      track.appendChild(shimmer);
    }
  }

  private removeShimmer(): void {
    this.el<HTMLDivElement>('[data-el="progress-track"]')
      ?.querySelector('.progress-shimmer')
      ?.remove();
  }

  protected onColorChange(): void {
    this.visualizer?.stop();
    this.visualizer = null;
    this.render();
    this.bindEvents();
  }

  disconnectedCallback(): void {
    if (this.progressRaf !== null) cancelAnimationFrame(this.progressRaf);
    this.visualizer?.stop();
    super.disconnectedCallback();
  }
}

export function defineGlassPlayer(tagName = 'music-player-glass'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, GlassPlayerElement);
  }
}
