import { html, unsafeCSS, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import styles from './minimal-player.css?inline';

export class MinimalPlayerElement extends BasePlayer {
  static styles = unsafeCSS(styles);

  render() {
    const track = this._currentTrack;
    const color = this.color;
    const vPct = `${this._volume * 100}%`;

    return html`
      <div class="minimal" style="--rp-color: ${color}">
        <div class="progress-track" @mousedown=${this._handleProgressMousedown}>
          <div class="progress-fill" style="width: ${this._isFullSong ? `${this._progress * 100}%` : '0%'}; background-color: ${color}"></div>
          ${this._isPlaying && !this._isFullSong ? html`
            <div class="progress-shimmer" style="background: linear-gradient(90deg, transparent, ${color}, transparent)"></div>
          ` : nothing}
        </div>
        <div class="row">
          <div class="controls">
            <button class="btn" @click=${() => this.controller.prev()} aria-label="Previous">
              ${unsafeHTML(skipBackIcon(18, color))}
            </button>
            <button class="play-btn" @click=${() => this.controller.togglePlay()}
                    aria-label=${this._isPlaying ? 'Pause' : 'Play'}
                    style="border-color: ${color}">
              ${this._isLoading
                ? html`<span class="spin">${unsafeHTML(loaderIcon(20, color))}</span>`
                : unsafeHTML(this._isPlaying ? pauseIcon(20, color) : playIcon(20, color))}
            </button>
            <button class="btn" @click=${() => this.controller.next()} aria-label="Next">
              ${unsafeHTML(skipForwardIcon(18, color))}
            </button>
          </div>
          <div class="info">
            <span class="artist">${track?.artist ?? ''}</span>
            <span class="separator">\u2014</span>
            <span class="name">${track?.name ?? ''}</span>
          </div>
          <div class="right">
            <span class="time">${this._formattedTime}</span>
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
      </div>
    `;
  }
}

export function defineMinimalPlayer(tagName = 'music-player-minimal'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, MinimalPlayerElement);
  }
}