import { formatTime } from '@awesome-web-projects/audio-engine';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import { minimalStyles } from './minimal-styles';

export class MinimalPlayerElement extends BasePlayer {
  private progressRaf: number | null = null;
  private volumeOpen = false;
  private dragging = false;
  private volumeDragging = false;

  protected render(): void {
    const color = this._color;
    const track = this.controller.currentTrack;

    this.shadow.innerHTML = `
      <style>${minimalStyles}</style>
      <div class="minimal" style="--rp-color: ${color}">
        <div class="progress-track" data-el="progress-track">
          <div class="progress-fill" data-el="progress-fill" style="background-color: ${color}"></div>
        </div>
        <div class="row">
          <div class="controls">
            <button class="btn" data-action="prev" aria-label="Previous">${skipBackIcon(18, color)}</button>
            <button class="play-btn" data-action="toggle" aria-label="Play" style="border-color: ${color}">
              ${playIcon(20, color)}
            </button>
            <button class="btn" data-action="next" aria-label="Next">${skipForwardIcon(18, color)}</button>
          </div>
          <div class="info">
            <span class="artist" data-el="artist">${track?.artist ?? ''}</span>
            <span class="separator">&mdash;</span>
            <span class="name" data-el="name">${track?.name ?? ''}</span>
          </div>
          <div class="right">
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
    this.controller.on('play', () => this.updatePlayButton());
    this.controller.on('pause', () => this.updatePlayButton());
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

    // Progress bar animation
    this.startProgressLoop();
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
    const color = this._color;
    if (this.controller.isLoading) {
      btn.innerHTML = `<span class="spin">${loaderIcon(20, color)}</span>`;
    } else if (this.controller.isPlaying) {
      btn.innerHTML = pauseIcon(20, color);
      btn.setAttribute('aria-label', 'Pause');
      this.addShimmer();
    } else {
      btn.innerHTML = playIcon(20, color);
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
    this.render();
    this.bindEvents();
  }

  disconnectedCallback(): void {
    if (this.progressRaf !== null) cancelAnimationFrame(this.progressRaf);
    super.disconnectedCallback();
  }
}

export function defineMinimalPlayer(tagName = 'music-player-minimal'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, MinimalPlayerElement);
  }
}