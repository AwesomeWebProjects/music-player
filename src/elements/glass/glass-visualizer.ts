import { colorWithAlpha } from '../../shared/color-utils';

interface VisualizerOptions {
  color: string;
  enabled: boolean;
  isPlaying: boolean;
}

export function startGlassVisualizer(
  canvas: HTMLCanvasElement,
  analyserNode: AnalyserNode | null,
  frequencyData: Uint8Array | null,
  options: VisualizerOptions,
): { stop: () => void; update: (opts: Partial<VisualizerOptions>) => void } {
  const ctx = canvas.getContext('2d')!;
  let animId: number | null = null;
  let currentOpts = { ...options };
  let _analyser = analyserNode;
  let _freqData = frequencyData;

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
  }

  function draw(): void {
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);

    if (!currentOpts.enabled || !currentOpts.isPlaying || !_analyser || !_freqData) {
      animId = requestAnimationFrame(draw);
      return;
    }

    _analyser.getByteFrequencyData(_freqData as Uint8Array<ArrayBuffer>);

    const maxBarHeight = height * 0.9;
    const totalGap = (BAR_COUNT - 1) * BAR_GAP;
    const barWidth = (width - totalGap) / BAR_COUNT;

    const gradBottom = colorWithAlpha(currentOpts.color, 0.5);
    const gradTop = colorWithAlpha(currentOpts.color, 0.05);
    const shadowColor = colorWithAlpha(currentOpts.color, 0.3);

    for (let i = 0; i < BAR_COUNT; i++) {
      const dataIndex = Math.floor((i / BAR_COUNT) * _freqData.length * 0.6);
      const value = _freqData[dataIndex] / 255;
      const barHeight = Math.max(MIN_BAR_HEIGHT, value * maxBarHeight);

      const x = i * (barWidth + BAR_GAP);
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, gradBottom);
      gradient.addColorStop(1, gradTop);

      ctx.fillStyle = gradient;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 16;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, BAR_RADIUS);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  animId = requestAnimationFrame(draw);

  return {
    stop(): void {
      if (animId !== null) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    },
    update(opts: Partial<VisualizerOptions> & { analyserNode?: AnalyserNode | null; frequencyData?: Uint8Array | null }): void {
      if (opts.analyserNode !== undefined) _analyser = opts.analyserNode;
      if (opts.frequencyData !== undefined) _freqData = opts.frequencyData;
      currentOpts = { ...currentOpts, ...opts };
    },
  };
}
