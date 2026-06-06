# @awesome-web-projects/music-player

Framework-agnostic audio player Web Components with multiple skins. Drop-in custom elements with Shadow DOM encapsulation — works in any framework or plain HTML. Powered by [`@awesome-web-projects/audio-engine`](https://github.com/AwesomeWebProjects/audio-engine).

## Features

- 5 player skins: Circular, Minimal, Waveform, Vinyl, and Glass
- Standard Web Components (`customElements.define`) — no framework lock-in
- Shadow DOM for full style encapsulation
- Canvas-based audio visualizers (circular, waveform, glass)
- Streaming audio loading via Web Workers
- Partial loading — starts playing in seconds, preloads the full song in the background
- Keyboard shortcuts (Space, N, B)
- Configurable colors and volume
- Full TypeScript support with exported types

## Installation

```bash
npm install @awesome-web-projects/music-player
```

## Usage

### HTML

```html
<script type="module">
  import '@awesome-web-projects/music-player';
</script>

<music-player-circular color="rgba(97, 218, 251, 0.8)"></music-player-circular>

<script>
  const player = document.querySelector('music-player-circular');
  player.tracks = [
    { name: 'Song One', artist: 'Artist A', url: '/songs/one.mp3' },
    { name: 'Song Two', artist: 'Artist B', url: '/songs/two.mp3' },
  ];
</script>
```

### JavaScript / TypeScript

```typescript
import { defineCircularPlayer, CircularPlayerElement } from '@awesome-web-projects/music-player';

// Elements are auto-registered on import, but you can also register individually:
// defineCircularPlayer();

const player = document.createElement('music-player-circular') as CircularPlayerElement;
player.tracks = [
  { name: 'Song One', artist: 'Artist A', url: '/songs/one.mp3' },
  { name: 'Song Two', artist: 'Artist B', url: '/songs/two.mp3' },
];
player.setAttribute('color', 'rgba(97, 218, 251, 0.8)');
document.body.appendChild(player);
```

### Framework Integration

Works in React, Vue, Svelte, Angular, or any framework that supports custom elements:

```tsx
// React example
function App() {
  const playerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (playerRef.current) {
      (playerRef.current as any).tracks = [
        { name: 'Song', artist: 'Artist', url: '/song.mp3' },
      ];
    }
  }, []);

  return <music-player-minimal ref={playerRef} color="rgba(97, 218, 251, 0.8)" />;
}
```

## Available Elements

| Element | Tag | Description |
|---------|-----|-------------|
| `CircularPlayerElement` | `<music-player-circular>` | Circular visualizer with frequency bars around a disc |
| `MinimalPlayerElement` | `<music-player-minimal>` | Clean, compact player with progress bar |
| `WaveformPlayerElement` | `<music-player-waveform>` | Waveform bar visualizer |
| `VinylPlayerElement` | `<music-player-vinyl>` | Spinning vinyl disc animation |
| `GlassPlayerElement` | `<music-player-glass>` | Frosted glass effect with frequency bars |

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `color` | `string` | `'rgba(97, 218, 251, 0.8)'` | Primary color for the player UI |
| `initial-volume` | `string` | `'0.5'` | Initial volume (0-1) |
| `thread` | `'main' \| 'worker'` | `'worker'` | Audio fetching strategy |
| `enable-keyboard` | `'true' \| 'false'` | `'true'` | Enable keyboard shortcuts |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `tracks` | `Track[]` | Array of tracks (set via JavaScript, not attribute) |

### Track

```typescript
interface Track {
  name: string;
  artist: string;
  url: string;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| N | Next track |
| B | Previous track |

## Selective Registration

By default, all elements are registered on import. To register only specific elements:

```typescript
import { defineCircularPlayer } from '@awesome-web-projects/music-player';

defineCircularPlayer(); // Only registers <music-player-circular>
```

Available registration functions: `defineCircularPlayer`, `defineMinimalPlayer`, `defineWaveformPlayer`, `defineVinylPlayer`, `defineGlassPlayer`, `defineAllPlayers`.

## Related Packages

- [`@awesome-web-projects/audio-engine`](https://github.com/AwesomeWebProjects/audio-engine) — The core audio engine this package is built on
- [`@awesome-web-projects/react-player`](https://github.com/AwesomeWebProjects/react-player) — React components using the same engine

## Development

```bash
npm install
npm run dev          # Start demo dev server
npm run build        # Build library
npm run build:demo   # Build demo page
npm run typecheck    # Type check
```

## License

MIT