import { colorWithAlpha } from '../../shared/color-utils';

interface VisualizerOptions {
  color: string;
  enabled: boolean;
  isPlaying: boolean;
}

export function startGlassVisualizer(
  canvas: HTMLCanvasElement,
  getAnalyser: () => AnalyserNode | null,
  getFrequencyData: () => Uint8Array | null,
  options: VisualizerOptions,
): { stop: () => void; update: (opts: Partial<VisualizerOptions>) => void } {
  const ctx = canvas.getContext('2d')!;
  let animId: number | null = null;
  let currentOpts = { ...options };
  let needsInitialDraw = true;

  const BAR_COUNT = 24;
  const BAR_GAP = 6;
  const MIN_BAR_HEIGHT = 4;
  const BAR_RADIUS = 3;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    needsInitialDraw = true;
  }

  function draw(): void {
    if (!currentOpts.enabled) {
      animId = requestAnimationFrame(draw);
      return;
    }

    const shouldDraw = currentOpts.isPlaying || needsInitialDraw;

    if (shouldDraw) {
      const analyser = getAnalyser();
      const freqData = getFrequencyData();

      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData as Uint8Array<ArrayBuffer>);
      }

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const data = freqData ?? new Uint8Array(0);
      const maxBarHeight = height * 0.9;
      const totalGap = (BAR_COUNT - 1) * BAR_GAP;
      const barWidth = (width - totalGap) / BAR_COUNT;
      const color = currentOpts.color;

      for (let i = 0; i < BAR_COUNT; i++) {
        const dataIndex = Math.floor((i / BAR_COUNT) * (data.length * 0.6));
        const value = data[dataIndex] || 0;
        const barH = Math.max(MIN_BAR_HEIGHT, (value / 255) * maxBarHeight);
        const x = i * (barWidth + BAR_GAP);
        const y = height - barH;

        ctx.save();
        const grad = ctx.createLinearGradient(x, height, x, y);
        grad.addColorStop(0, colorWithAlpha(color, 0.5));
        grad.addColorStop(0.5, colorWithAlpha(color, 0.25));
        grad.addColorStop(1, colorWithAlpha(color, 0.05));
        ctx.fillStyle = grad;
        ctx.shadowColor = colorWithAlpha(color, 0.3);
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, BAR_RADIUS);
        ctx.fill();
        ctx.restore();
      }

      needsInitialDraw = false;
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  needsInitialDraw = true;
  animId = requestAnimationFrame(draw);

  return {
    stop(): void {
      if (animId !== null) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    },
    update(opts: Partial<VisualizerOptions>): void {
      currentOpts = { ...currentOpts, ...opts };
    },
  };
}
