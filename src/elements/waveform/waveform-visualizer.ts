import { colorWithAlpha } from '../../shared/color-utils';

const BAR_COUNT = 64;
const BAR_GAP = 2;
const BAR_RADIUS = 2;
const MIN_BAR_HEIGHT = 2;

interface VisualizerOptions {
  color: string;
  enabled: boolean;
  isPlaying: boolean;
  getProgress: () => number;
  isFullSong: boolean;
  onSeek?: (progress: number) => void;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (h < r * 2) r = h / 2;
  if (w < r * 2) r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function startWaveformVisualizer(
  canvas: HTMLCanvasElement,
  getAnalyser: () => AnalyserNode | null,
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null,
  options: VisualizerOptions,
): { stop: () => void; update: (opts: Partial<VisualizerOptions>) => void } {
  const ctx = canvas.getContext('2d')!;
  let running = true;
  let opts = { ...options };
  let hasDrawnOnce = false;
  let dragging = false;

  function sizeCanvas(): { w: number; h: number; dpr: number } {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    return { w: rect.width, h: rect.height, dpr };
  }

  let dims = sizeCanvas();

  const resizeObserver = new ResizeObserver(() => {
    dims = sizeCanvas();
    hasDrawnOnce = false;
  });
  resizeObserver.observe(canvas);

  function getSeekProgress(e: MouseEvent): number {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return x / rect.width;
  }

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    if (opts.isFullSong && opts.onSeek) {
      opts.onSeek(getSeekProgress(e));
    }
  });

  const onMouseMove = (e: MouseEvent) => {
    if (dragging && opts.isFullSong && opts.onSeek) {
      opts.onSeek(getSeekProgress(e));
    }
  };

  const onMouseUp = () => {
    dragging = false;
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  function draw(timestamp: number): void {
    if (!running) return;

    const shouldDraw = opts.isPlaying || !hasDrawnOnce || dragging;

    if (shouldDraw) {
      hasDrawnOnce = true;
      const { w, h } = dims;

      // Reset transform and clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const analyser = getAnalyser();
      const frequencyData = getFrequencyData();

      const totalGap = BAR_GAP * (BAR_COUNT - 1);
      const barWidth = (w - totalGap) / BAR_COUNT;
      const maxBarHeight = h * 0.85;
      const progress = opts.getProgress();

      if (analyser && frequencyData && opts.enabled) {
        analyser.getByteFrequencyData(frequencyData);
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / BAR_COUNT;
        let barHeight = MIN_BAR_HEIGHT;

        if (frequencyData && opts.enabled) {
          const dataIndex = Math.floor(Math.pow(t, 2.2) * frequencyData.length * 0.55);
          const clampedIndex = Math.min(dataIndex, frequencyData.length - 1);
          const value = frequencyData[clampedIndex] / 255;
          barHeight = Math.max(MIN_BAR_HEIGHT, value * maxBarHeight);
        }

        const x = i * (barWidth + BAR_GAP);
        const y = h - barHeight;

        const isPlayed = opts.isFullSong && t <= progress;

        if (isPlayed) {
          // Played bar: bright gradient with glow
          const gradient = ctx.createLinearGradient(x, y, x, h);
          gradient.addColorStop(0, colorWithAlpha(opts.color, 0.95));
          gradient.addColorStop(1, colorWithAlpha(opts.color, 0.4));

          ctx.save();
          ctx.shadowColor = colorWithAlpha(opts.color, 0.3);
          ctx.shadowBlur = 8;
          drawRoundRect(ctx, x, y, barWidth, barHeight, BAR_RADIUS);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        } else {
          // Unplayed bar: dim gradient, no shadow
          const gradient = ctx.createLinearGradient(x, y, x, h);
          gradient.addColorStop(0, colorWithAlpha(opts.color, 0.3));
          gradient.addColorStop(1, colorWithAlpha(opts.color, 0.08));

          drawRoundRect(ctx, x, y, barWidth, barHeight, BAR_RADIUS);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      // Streaming shimmer effect
      if (!opts.isFullSong && opts.isPlaying) {
        const shimmerWidth = w * 0.3;
        const shimmerX = ((timestamp * 0.15) % (w + shimmerWidth)) - shimmerWidth;
        const shimmerGradient = ctx.createLinearGradient(shimmerX, 0, shimmerX + shimmerWidth, 0);
        shimmerGradient.addColorStop(0, 'rgba(255,255,255,0)');
        shimmerGradient.addColorStop(0.5, colorWithAlpha(opts.color, 0.12));
        shimmerGradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = shimmerGradient;
        ctx.fillRect(0, 0, w, h);
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  return {
    stop() {
      running = false;
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
    update(newOpts: Partial<VisualizerOptions>) {
      opts = { ...opts, ...newOpts };
    },
  };
}
