import { html, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon } from '../../shared/icons';
import { startCircularVisualizer } from './circular-visualizer';
import styles from './circular-player.css?inline';

export class CircularPlayerElement extends BasePlayer {
  static styles = unsafeCSS(styles);

  private visualizer: ReturnType<typeof startCircularVisualizer> | null = null;

  firstUpdated(): void {
    this._initVisualizer();
    this.controller.on('play', () => this._updateVisualizer());
    this.controller.on('pause', () => this._updateVisualizer());
    this.controller.on('volumechange', () => this._updateVisualizer());
    this.controller.on('fullsongloaded', () => this._updateVisualizer());
  }

  disconnectedCallback(): void {
    this.visualizer?.stop();
    this.visualizer = null;
    super.disconnectedCallback();
  }

  private _initVisualizer(): void {
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    this.visualizer = startCircularVisualizer(
      canvas,
      () => this.controller.analyserNode,
      () => this.controller.frequencyData,
      {
        color: this.color,
        enabled: true,
        isPlaying: this._isPlaying,
        volume: this._volume,
        getProgress: () => this.controller.getProgress(),
        isFullSong: this._isFullSong,
        onSeek: (progress) => this.controller.seek(progress),
      },
    );
  }

  private _updateVisualizer(): void {
    this.visualizer?.update({
      color: this.color,
      isPlaying: this._isPlaying,
      volume: this._volume,
      isFullSong: this._isFullSong,
    });
  }

  render() {
    const track = this._currentTrack;
    const color = this.color;
    const vPct = `${this._volume * 100}%`;

    return html`
      <div class="audio-player" style="--rp-color: ${color}">
        <div class="player">
          <canvas class="canvas"></canvas>
          <div class="song-info">
            <div class="song-artist">${track?.artist ?? ''}</div>
            <div class="song-name">${track?.name ?? ''}</div>
          </div>
          <div class="controls">
            <button class="btn" @click=${() => this.controller.prev()} aria-label="Previous">
              ${unsafeHTML(skipBackIcon(48, color))}
            </button>
            <button class="play-btn" @click=${() => this.controller.togglePlay()}
                    aria-label=${this._isPlaying ? 'Pause' : 'Play'}
                    style="border-color: ${color}">
              ${this._isLoading
                ? html`<div class="loader"><div style="border-color: ${color}"></div><div style="border-color: ${color}"></div></div>`
                : unsafeHTML(this._isPlaying ? pauseIcon(48, color) : playIcon(48, color))}
            </button>
            <button class="btn" @click=${() => this.controller.next()} aria-label="Next">
              ${unsafeHTML(skipForwardIcon(48, color))}
            </button>
          </div>
          <div class="footer">
            <div class="volume-control">
              ${this._volumeOpen ? html`
                <div class="volume-slider">
                  <div class="volume-track" @mousedown=${this._handleVolumeMousedown}>
                    <div class="volume-fill" style="width: ${vPct}; background-color: ${color}; box-shadow: 0 0 6px ${color}"></div>
                    <div class="volume-thumb" style="left: ${vPct}; background-color: ${color}; box-shadow: 0 0 4px ${color}"></div>
                  </div>
                </div>
              ` : html`
                <button class="volume-btn" @click=${this._toggleVolume} aria-label="Volume">
                  ${unsafeHTML(volumeIcon(this._volume, 24, color))}
                </button>
              `}
            </div>
            <div class="time">${this._formattedTime}</div>
          </div>
        </div>
      </div>
    `;
  }
}

export function defineCircularPlayer(tagName = 'music-player-circular'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, CircularPlayerElement);
  }
}
