import { formatTime } from '@awesome-web-projects/audio-engine';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import { waveformStyles } from './waveform-styles';
import { startWaveformVisualizer } from './waveform-visualizer';

export class WaveformPlayerElement extends BasePlayer {
  private volumeOpen = false;
  private volumeDragging = false;
  private visualizer: ReturnType<typeof startWaveformVisualizer> | null = null;

  protected render(): void {
    const color = this._color;
    const track = this.controller.currentTrack;

    this.shadow.innerHTML = `
      <style>${waveformStyles}</style>
      <div class="waveform">
        <canvas class="canvas" data-el="canvas"></canvas>
        <div class="bottom">
          <div class="info-col">
            <div class="artist" data-el="artist">${track?.artist ?? ''}</div>
            <div class="name" data-el="name">${track?.name ?? ''}</div>
          </div>
          <div class="controls">
            <button class="btn" data-action="prev" aria-label="Previous">${skipBackIcon(18, color)}</button>
            <button class="play-btn" data-action="toggle" aria-label="Play" style="border-color: ${color}">
              ${playIcon(18, color)}
            </button>
            <button class="btn" data-action="next" aria-label="Next">${skipForwardIcon(18, color)}</button>
          </div>
          <div class="right-col">
            <span class="time" data-el="time">00:00</span>
            <div class="volume-area" data-el="volume-area">
              <button class="btn" data-action="volume-toggle" aria-label="Volume">${volumeIcon(0.5, 18, color)}</button>
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
    // Button clicks
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

    // Volume drag
    const volumeTrack = this.el<HTMLDivElement>('[data-el="volume-track"]');
    volumeTrack.addEventListener('mousedown', (e) => {
      this.volumeDragging = true;
      this.applyVolume(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.volumeDragging) this.applyVolume(e);
    });
    window.addEventListener('mouseup', () => {
      this.volumeDragging = false;
    });

    // Controller events
    this.controller.on('play', () => {
      this.updatePlayButton();
      this.updateVisualizer();
    });
    this.controller.on('pause', () => {
      this.updatePlayButton();
      this.updateVisualizer();
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
    this.controller.on('fullsongloaded', () => this.updateVisualizer());

    // Start visualizer
    this.startVisualizer();
  }

  private startVisualizer(): void {
    const canvas = this.el<HTMLCanvasElement>('[data-el="canvas"]');
    this.visualizer = startWaveformVisualizer(
      canvas,
      () => this.controller.analyserNode,
      () => this.controller.frequencyData,
      {
        color: this._color,
        enabled: true,
        isPlaying: this.controller.isPlaying,
        getProgress: () => this.controller.getProgress(),
        isFullSong: this.controller.isFullSong,
        onSeek: (progress) => this.controller.seek(progress),
      },
    );
  }

  private updateVisualizer(): void {
    this.visualizer?.update({
      color: this._color,
      isPlaying: this.controller.isPlaying,
      isFullSong: this.controller.isFullSong,
    });
  }

  private applyVolume(e: MouseEvent): void {
    const track = this.el<HTMLDivElement>('[data-el="volume-track"]');
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    this.controller.setVolume(x / rect.width);
  }

  private updatePlayButton(): void {
    const btn = this.el<HTMLButtonElement>('[data-action="toggle"]');
    const color = this._color;
    if (this.controller.isLoading) {
      btn.innerHTML = `<span class="spin">${loaderIcon(18, color)}</span>`;
    } else if (this.controller.isPlaying) {
      btn.innerHTML = pauseIcon(18, color);
      btn.setAttribute('aria-label', 'Pause');
    } else {
      btn.innerHTML = playIcon(18, color);
      btn.setAttribute('aria-label', 'Play');
    }
  }

  private updateVolumeUI(v: number): void {
    const fill = this.el<HTMLDivElement>('[data-el="volume-fill"]');
    const thumb = this.el<HTMLDivElement>('[data-el="volume-thumb"]');
    const btn = this.el<HTMLButtonElement>('[data-action="volume-toggle"]');
    fill.style.width = `${v * 100}%`;
    thumb.style.left = `${v * 100}%`;
    btn.innerHTML = volumeIcon(v, 18, this._color);
    btn.setAttribute('aria-label', `Volume: ${Math.round(v * 100)}%`);
  }

  protected onColorChange(): void {
    this.visualizer?.stop();
    this.visualizer = null;
    this.render();
    this.bindEvents();
  }

  disconnectedCallback(): void {
    this.visualizer?.stop();
    this.visualizer = null;
    super.disconnectedCallback();
  }
}

export function defineWaveformPlayer(tagName = 'music-player-waveform'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, WaveformPlayerElement);
  }
}
