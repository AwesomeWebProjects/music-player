import { html, unsafeCSS, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import styles from './vinyl-player.css?inline';

function getInitials(artist: string): string {
  return artist
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export class VinylPlayerElement extends BasePlayer {
  static styles = unsafeCSS(styles);

  render() {
    const track = this._currentTrack;
    const color = this.color;
    const artist = track?.artist ?? '';
    const initials = getInitials(artist);
    const vPct = `${this._volume * 100}%`;

    return html`
      <div class="vinyl">
        <div class="disc-area">
          <div class="disc ${this._isPlaying ? 'playing' : ''}">
            <div class="grooves"></div>
            <div class="label" style="border-color: ${color}">
              <span class="initials" style="color: ${color}">${initials}</span>
            </div>
          </div>
          <div class="tonearm ${this._isPlaying ? 'playing' : ''}"></div>
        </div>
        <div class="info">
          <div class="artist">${artist}</div>
          <div class="name">${track?.name ?? ''}</div>
        </div>
        <div class="progress-track" @mousedown=${this._handleProgressMousedown}>
          <div class="progress-fill" style="width: ${this._isFullSong ? `${this._progress * 100}%` : '0%'}; background-color: ${color}"></div>
          ${this._isPlaying && !this._isFullSong ? html`
            <div class="progress-shimmer" style="background: linear-gradient(90deg, transparent, ${color}, transparent)"></div>
          ` : nothing}
        </div>
        <div class="controls-row">
          <span class="time">${this._formattedTime}</span>
          <div class="controls">
            <button class="btn" @click=${() => this.controller.prev()} aria-label="Previous">
              ${unsafeHTML(skipBackIcon(20, color))}
            </button>
            <button class="play-btn" @click=${() => this.controller.togglePlay()}
                    aria-label=${this._isPlaying ? 'Pause' : 'Play'}
                    style="border-color: ${color}">
              ${this._isLoading
                ? html`<span class="spin">${unsafeHTML(loaderIcon(24, color))}</span>`
                : unsafeHTML(this._isPlaying ? pauseIcon(24, color) : playIcon(24, color))}
            </button>
            <button class="btn" @click=${() => this.controller.next()} aria-label="Next">
              ${unsafeHTML(skipForwardIcon(20, color))}
            </button>
          </div>
          <div class="volume-area">
            <button class="btn" @click=${this._toggleVolume} aria-label="Volume">
              ${unsafeHTML(volumeIcon(this._volume, 18, color))}
            </button>
            ${this._volumeOpen ? html`
              <div class="volume-slider">
                <div class="volume-track" @mousedown=${this._handleVolumeMousedown}>
                  <div class="volume-fill" style="width: ${vPct}; background-color: ${color}"></div>
                  <div class="volume-thumb" style="left: ${vPct}; background-color: ${color}"></div>
                </div>
              </div>
            ` : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

export function defineVinylPlayer(tagName = 'music-player-vinyl'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, VinylPlayerElement);
  }
}
