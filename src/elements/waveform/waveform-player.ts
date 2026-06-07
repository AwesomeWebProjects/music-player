import { html, unsafeCSS, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BasePlayer } from '../../shared/base-player';
import { playIcon, pauseIcon, skipForwardIcon, skipBackIcon, volumeIcon, loaderIcon } from '../../shared/icons';
import { startWaveformVisualizer } from './waveform-visualizer';
import styles from './waveform-player.css?inline';

export class WaveformPlayerElement extends BasePlayer {
  static styles = unsafeCSS(styles);

  private visualizer: ReturnType<typeof startWaveformVisualizer> | null = null;

  firstUpdated(): void {
    this._initVisualizer();
    this.controller.on('play', () => this._updateVisualizer());
    this.controller.on('pause', () => this._updateVisualizer());
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
    this.visualizer = startWaveformVisualizer(
      canvas,
      () => this.controller.analyserNode,
      () => this.controller.frequencyData,
      {
        color: this.color,
        enabled: true,
        isPlaying: this._isPlaying,
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
      isFullSong: this._isFullSong,
    });
  }

  render() {
    const track = this._currentTrack;
    const color = this.color;
    const vPct = `${this._volume * 100}%`;

    return html`
      <div class="waveform">
        <canvas class="canvas"></canvas>
        <div class="bottom">
          <div class="info-col">
            <div class="artist">${track?.artist ?? ''}</div>
            <div class="name">${track?.name ?? ''}</div>
          </div>
          <div class="controls">
            <button class="btn" @click=${() => this.controller.prev()} aria-label="Previous">
              ${unsafeHTML(skipBackIcon(20, color))}
            </button>
            <button class="play-btn" @click=${() => this.controller.togglePlay()}
                    aria-label=${this._isPlaying ? 'Pause' : 'Play'}
                    style="border-color: ${color}">
              ${this._isLoading
                ? html`<span class="spin">${unsafeHTML(loaderIcon(22, color))}</span>`
                : unsafeHTML(this._isPlaying ? pauseIcon(22, color) : playIcon(22, color))}
            </button>
            <button class="btn" @click=${() => this.controller.next()} aria-label="Next">
              ${unsafeHTML(skipForwardIcon(20, color))}
            </button>
          </div>
          <div class="right-col">
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

export function defineWaveformPlayer(tagName = 'music-player-waveform'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, WaveformPlayerElement);
  }
}
