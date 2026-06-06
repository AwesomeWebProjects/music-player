import { html, unsafeCSS, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import { startGlassVisualizer } from './glass-visualizer';
import styles from './glass-player.css?inline';

const WHITE = 'rgba(255, 255, 255, 0.8)';
const WHITE_BRIGHT = 'rgba(255, 255, 255, 0.9)';

export class GlassPlayerElement extends BasePlayer {
  static styles = unsafeCSS(styles);

  private visualizer: ReturnType<typeof startGlassVisualizer> | null = null;

  firstUpdated(): void {
    this._initVisualizer();
    this.controller.on('play', () => this.visualizer?.update({ isPlaying: true }));
    this.controller.on('pause', () => this.visualizer?.update({ isPlaying: false }));
  }

  disconnectedCallback(): void {
    this.visualizer?.stop();
    super.disconnectedCallback();
  }

  private _initVisualizer(): void {
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    this.visualizer = startGlassVisualizer(
      canvas,
      this.controller.analyserNode,
      this.controller.frequencyData,
      {
        color: this.color,
        enabled: true,
        isPlaying: this._isPlaying,
      },
    );
  }

  render() {
    const track = this._currentTrack;
    const color = this.color;
    const vPct = `${this._volume * 100}%`;

    return html`
      <div class="glass">
        <canvas class="canvas"></canvas>
        <div class="overlay">
          <div class="info">
            <div class="artist">${track?.artist ?? ''}</div>
            <div class="name">${track?.name ?? ''}</div>
          </div>
          <div class="controls">
            <button class="btn" @click=${() => this.controller.prev()} aria-label="Previous">
              ${unsafeHTML(skipBackIcon(20, WHITE_BRIGHT))}
            </button>
            <button class="play-btn" @click=${() => this.controller.togglePlay()}
                    aria-label=${this._isPlaying ? 'Pause' : 'Play'}>
              ${this._isLoading
                ? html`<span class="spin">${unsafeHTML(loaderIcon(24, WHITE_BRIGHT))}</span>`
                : unsafeHTML(this._isPlaying ? pauseIcon(24, WHITE_BRIGHT) : playIcon(24, WHITE_BRIGHT))}
            </button>
            <button class="btn" @click=${() => this.controller.next()} aria-label="Next">
              ${unsafeHTML(skipForwardIcon(20, WHITE_BRIGHT))}
            </button>
          </div>
          <div class="progress-track" @mousedown=${this._handleProgressMousedown}>
            <div class="progress-fill" style="width: ${this._isFullSong ? `${this._progress * 100}%` : '0%'}; background-color: ${color}"></div>
            ${this._isPlaying && !this._isFullSong ? html`
              <div class="progress-shimmer" style="background: linear-gradient(90deg, transparent, ${color}, transparent)"></div>
            ` : nothing}
          </div>
          <div class="bottom-row">
            <span class="time">${this._formattedTime}</span>
            <div class="volume-area">
              <button class="btn" @click=${this._toggleVolume} aria-label="Volume">
                ${unsafeHTML(volumeIcon(this._volume, 18, WHITE))}
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

export function defineGlassPlayer(tagName = 'music-player-glass'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, GlassPlayerElement);
  }
}
