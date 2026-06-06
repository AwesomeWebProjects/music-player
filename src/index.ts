import { defineMinimalPlayer } from './elements/minimal/minimal-player';
import { defineCircularPlayer } from './elements/circular/circular-player';
import { defineWaveformPlayer } from './elements/waveform/waveform-player';
import { defineVinylPlayer } from './elements/vinyl/vinyl-player';
import { defineGlassPlayer } from './elements/glass/glass-player';

// Elements
export { MinimalPlayerElement, defineMinimalPlayer } from './elements/minimal/minimal-player';
export { CircularPlayerElement, defineCircularPlayer } from './elements/circular/circular-player';
export { WaveformPlayerElement, defineWaveformPlayer } from './elements/waveform/waveform-player';
export { VinylPlayerElement, defineVinylPlayer } from './elements/vinyl/vinyl-player';
export { GlassPlayerElement, defineGlassPlayer } from './elements/glass/glass-player';

// Re-export engine types for convenience
export type { Track } from '@awesome-web-projects/audio-engine';
export { PlayerController } from '@awesome-web-projects/audio-engine';

// Register all custom elements at once
export function defineAllPlayers(): void {
  defineMinimalPlayer();
  defineCircularPlayer();
  defineWaveformPlayer();
  defineVinylPlayer();
  defineGlassPlayer();
}

// Auto-register on import
defineAllPlayers();