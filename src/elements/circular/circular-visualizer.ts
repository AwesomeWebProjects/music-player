import { colorWithAlpha } from '../../shared/color-utils';

const SCENE_PADDING = 120;
const MIN_SIZE = 740;
const OPTIMIZE_HEIGHT = 982;
const BASE_TICK_SIZE = 10;
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
  const points: TickPoint[] = [];
  for (let i = 0; i < countTicks; i++) {
    const angle = (i * 360) / countTicks;
    const rad = (angle * Math.PI) / 180;
    points.push({
      x: Math.cos(rad),
      y: Math.sin(rad),
      angle,
    });
  }
  return points;
}

function computeTicks(
  frequencyData: Uint8Array,
  sceneRadius: number,
  scaleCoef: number,
  volume: number,
): TickSegment[] {
  const countTicks = Math.floor(360 * scaleCoef);
  const tickPoints = getTickPoints(countTicks);
  const ticks: TickSegment[] = [];
  const length = tickPoints.length;

  for (let i = 0; i < length; i++) {
    const tick = tickPoints[i];
    const dataIndex = i % frequencyData.length;
    const freq = frequencyData[dataIndex];
    const coef = 1 - i / (length * 2.5);

    let delta: number;
    if (volume === 0) {
      delta = 0;
    } else if (volume <= 0.5) {
      delta = ((freq - LESSER * coef) * scaleCoef * volume) / 0.5 / 2;
    } else {
      delta = ((freq - LESSER * coef) * scaleCoef * volume) / 1;
    }
    if (delta < 0) delta = 0;

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
  const gradient = ctx.createLinearGradient(
    cx + tick.x1, cy + tick.y1,
    cx + tick.x2, cy + tick.y2,
  );
  gradient.addColorStop(0, colorWithAlpha(color, 0.3));
  gradient.addColorStop(1, colorWithAlpha(color, 0.9));

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
  const trackerRadius = sceneRadius - TRACKER_INNER_DELTA;
  ctx.beginPath();
  ctx.arc(cx, cy, trackerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = colorWithAlpha(color, 0.15);
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTracker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sceneRadius: number,
  color: string,
  progress: number,
): void {
  const trackerRadius = sceneRadius - TRACKER_INNER_DELTA;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + progress * Math.PI * 2;

  // Progress arc
  ctx.beginPath();
  ctx.arc(cx, cy, trackerRadius, startAngle, endAngle);
  ctx.strokeStyle = colorWithAlpha(color, 0.8);
  ctx.lineWidth = TRACKER_LINE_WIDTH;
  ctx.stroke();

  // Dot at end of arc
  if (progress > 0) {
    const dotX = cx + trackerRadius * Math.cos(endAngle);
    const dotY = cy + trackerRadius * Math.sin(endAngle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(color, 1);
    ctx.fill();
  }
}

function drawStreamingIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sceneRadius: number,
  color: string,
  timestamp: number,
): void {
  const trackerRadius = sceneRadius - TRACKER_INNER_DELTA;
  const segments = 50;
  const speed = 0.002;
  const tailLength = Math.PI * 0.6;
  const headAngle = -Math.PI / 2 + (timestamp * speed) % (Math.PI * 2);

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const opacity = t * t; // Quadratic fade-in
    const segStart = headAngle - tailLength * (1 - i / segments);
    const segEnd = headAngle - tailLength * (1 - (i + 1) / segments);

    ctx.beginPath();
    ctx.arc(cx, cy, trackerRadius, segStart, segEnd);
    ctx.strokeStyle = colorWithAlpha(color, opacity * 0.6);
    ctx.lineWidth = TRACKER_LINE_WIDTH;
    ctx.stroke();
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

  const trackerRadius = sceneRadius - TRACKER_INNER_DELTA;

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
    if (Math.abs(distance - trackerRadius) < 20) {
      const progress = angleToProgress(angle);
      opts.onSeek(progress);
    }
  }

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const { distance } = getAngleFromEvent(e);
    if (Math.abs(distance - trackerRadius) < 20) {
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
      ctx.clearRect(0, 0, size, size);

      // Draw edging circle
      drawEdging(ctx, cx, cy, sceneRadius, opts.color);

      // Draw frequency ticks
      const analyser = getAnalyser();
      const frequencyData = getFrequencyData();
      if (analyser && frequencyData && opts.enabled) {
        analyser.getByteFrequencyData(frequencyData);
        const ticks = computeTicks(frequencyData, sceneRadius, scaleCoef, opts.volume);
        for (const tick of ticks) {
          drawTick(ctx, cx, cy, tick, opts.color);
        }
      }

      // Draw progress tracker or streaming indicator
      if (opts.isFullSong) {
        const progress = opts.getProgress();
        drawTracker(ctx, cx, cy, sceneRadius, opts.color, progress);
      } else if (opts.isPlaying) {
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
