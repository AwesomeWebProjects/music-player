import { colorWithAlpha } from '../../shared/color-utils';

const SCENE_PADDING = 120;
const MIN_SIZE = 740;
const OPTIMIZE_HEIGHT = 982;
const BASE_TICK_SIZE = 10;
const FULL_CIRCLE_DEG = 360;
const LESSER = 160;
const TRACKER_INNER_DELTA = 20;
const TRACKER_LINE_WIDTH = 3;

interface TickPoint {
  x: number;
  y: number;
  angle: number;
}

interface TickSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface VisualizerOptions {
  color: string;
  enabled: boolean;
  isPlaying: boolean;
  volume: number;
  getProgress: () => number;
  isFullSong: boolean;
  onSeek?: (progress: number) => void;
}

function getTickPoints(countTicks: number): TickPoint[] {
  const step = FULL_CIRCLE_DEG / countTicks;
  const coords: TickPoint[] = [];
  for (let deg = 0; deg < FULL_CIRCLE_DEG; deg += step) {
    const rad = (deg * Math.PI) / (FULL_CIRCLE_DEG / 2);
    coords.push({ x: Math.cos(rad), y: -Math.sin(rad), angle: deg });
  }
  return coords;
}

function computeTicks(
  frequencyData: Uint8Array,
  sceneRadius: number,
  scaleCoef: number,
  volume: number,
): TickSegment[] {
  const countTicks = Math.floor(FULL_CIRCLE_DEG * scaleCoef);
  const tickPoints = getTickPoints(countTicks);
  const ticks: TickSegment[] = [];

  for (let i = 0; i < tickPoints.length; i++) {
    const coef = 1 - i / (tickPoints.length * 2.5);
    let delta = 0;

    const freq = frequencyData[i] || 0;
    if (volume === 0) {
      delta = 0;
    } else if (volume <= 0.5) {
      delta = ((freq - LESSER * coef) * scaleCoef * volume) / 0.5 / 2;
    } else {
      delta = ((freq - LESSER * coef) * scaleCoef * volume) / 1;
    }

    if (delta < 0) delta = 0;

    const tick = tickPoints[i];
    const k = sceneRadius / (sceneRadius - (BASE_TICK_SIZE + delta));
    const x1 = tick.x * (sceneRadius - BASE_TICK_SIZE);
    const y1 = tick.y * (sceneRadius - BASE_TICK_SIZE);
    const x2 = x1 * k;
    const y2 = y1 * k;
    ticks.push({ x1, y1, x2, y2 });
  }

  return ticks;
}

function drawTick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tick: TickSegment,
  color: string,
): void {
  const dx1 = Math.round(cx + tick.x1);
  const dy1 = Math.round(cy + tick.y1);
  const dx2 = Math.round(cx + tick.x2);
  const dy2 = Math.round(cy + tick.y2);

  const gradient = ctx.createLinearGradient(dx1, dy1, dx2, dy2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(1, '#F5F5F5');

  ctx.beginPath();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.moveTo(cx + tick.x1, cy + tick.y1);
  ctx.lineTo(cx + tick.x2, cy + tick.y2);
  ctx.stroke();
}

function drawEdging(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sceneRadius: number,
  color: string,
): void {
  const trackerR = sceneRadius - (TRACKER_INNER_DELTA + TRACKER_LINE_WIDTH / 2);

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = colorWithAlpha(color, 0.5);
  ctx.lineWidth = 1;
  ctx.arc(cx, cy, trackerR, 0, Math.PI * 2, false);
  ctx.stroke();
  ctx.restore();
}

function drawTracker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sceneRadius: number,
  color: string,
  progress: number,
): void {
  const trackerR = sceneRadius - (TRACKER_INNER_DELTA + TRACKER_LINE_WIDTH / 2);
  const angle = progress * 2 * Math.PI;

  if (angle <= 0) return;

  // Draw progress arc
  ctx.save();
  ctx.strokeStyle = colorWithAlpha(color, 0.8);
  ctx.beginPath();
  ctx.lineWidth = TRACKER_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.arc(cx, cy, trackerR, -Math.PI / 2, -Math.PI / 2 + angle, false);
  ctx.stroke();
  ctx.restore();

  // Draw position dot
  const dotAngle = -Math.PI / 2 + angle;
  const dotX = cx + trackerR * Math.cos(dotAngle);
  const dotY = cy + trackerR * Math.sin(dotAngle);

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = colorWithAlpha(color, 0.9);
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.restore();
}

function drawStreamingIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sceneRadius: number,
  color: string,
  timestamp: number,
): void {
  const trackerR = sceneRadius - (TRACKER_INNER_DELTA + TRACKER_LINE_WIDTH / 2);

  const speed = 0.0016;
  const baseAngle = (timestamp * speed) % (Math.PI * 2);
  const arcLength = Math.PI * 0.8;
  const steps = 50;
  const stepSize = arcLength / steps;

  // Draw the arc as a series of tiny segments with fading opacity
  // to create a comet-tail / light-trail effect
  for (let i = 0; i < steps; i++) {
    const t = i / steps; // 0 = tail, 1 = head
    const opacity = t * t * 0.9; // quadratic fade-in toward the head
    const startAngle = baseAngle + i * stepSize;
    const endAngle = startAngle + stepSize + 0.005; // tiny overlap to avoid gaps

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(color, opacity);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = colorWithAlpha(color, opacity * 0.8);
    ctx.shadowBlur = 12 * t;
    ctx.beginPath();
    ctx.arc(cx, cy, trackerR, startAngle, endAngle, false);
    ctx.stroke();
    ctx.restore();
  }
}

export function startCircularVisualizer(
  canvas: HTMLCanvasElement,
  getAnalyser: () => AnalyserNode | null,
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null,
  options: VisualizerOptions,
): { stop: () => void; update: (opts: Partial<VisualizerOptions>) => void } {
  const size = MIN_SIZE;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  const scaleCoef = Math.max(0.5, MIN_SIZE / OPTIMIZE_HEIGHT);
  const sceneRadius = (size - SCENE_PADDING * 2) / 2;
  const cx = sceneRadius + SCENE_PADDING;
  const cy = sceneRadius + SCENE_PADDING;

  let running = true;
  let opts = { ...options };
  let hasDrawnOnce = false;
  let dragging = false;

  const trackerR = sceneRadius - (TRACKER_INNER_DELTA + TRACKER_LINE_WIDTH / 2);

  function angleToProgress(angle: number): number {
    // Normalize angle relative to -PI/2 (12 o'clock)
    let normalized = angle + Math.PI / 2;
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized / (Math.PI * 2);
  }

  function getAngleFromEvent(e: MouseEvent): { angle: number; distance: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const x = (e.clientX - rect.left) * scaleX - cx;
    const y = (e.clientY - rect.top) * scaleY - cy;
    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    return { angle, distance };
  }

  function handleSeek(e: MouseEvent): void {
    if (!opts.isFullSong || !opts.onSeek) return;
    const { angle, distance } = getAngleFromEvent(e);
    if (Math.abs(distance - trackerR) < 20) {
      const progress = angleToProgress(angle);
      opts.onSeek(progress);
    }
  }

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const { distance } = getAngleFromEvent(e);
    if (Math.abs(distance - trackerR) < 20) {
      dragging = true;
      handleSeek(e);
    }
  });

  const onMouseMove = (e: MouseEvent) => {
    if (dragging) handleSeek(e);
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

      // Update frequency data from analyser
      const analyser = getAnalyser();
      const frequencyData = getFrequencyData();
      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
      }

      ctx.clearRect(0, 0, size, size);

      // Draw ticks
      const ticks = computeTicks(
        frequencyData ?? new Uint8Array(0),
        sceneRadius,
        scaleCoef,
        opts.volume,
      );

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 1;
      for (const tick of ticks) {
        drawTick(ctx, cx, cy, tick, opts.color);
      }
      ctx.restore();

      // Draw edging
      drawEdging(ctx, cx, cy, sceneRadius, opts.color);

      // Draw tracker
      const progress = opts.getProgress();
      if (opts.isFullSong) {
        drawTracker(ctx, cx, cy, sceneRadius, opts.color, progress);
      } else if (progress > 0) {
        drawStreamingIndicator(ctx, cx, cy, sceneRadius, opts.color, timestamp);
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  return {
    stop() {
      running = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
    update(newOpts: Partial<VisualizerOptions>) {
      opts = { ...opts, ...newOpts };
    },
  };
}
