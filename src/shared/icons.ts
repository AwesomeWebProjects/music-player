export function iconSvg(
  path: string,
  size: number,
  color: string,
  fill = 'none',
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export const playPath = '<polygon points="6 3 20 12 6 21 6 3"></polygon>';
export const pausePath =
  '<rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect>';
export const skipForwardPath =
  '<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>';
export const skipBackPath =
  '<polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line>';
export const volume2Path =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>';
export const volume1Path =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path>';
export const volumeXPath =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><line x1="22" y1="9" x2="16" y2="15"></line><line x1="16" y1="9" x2="22" y2="15"></line>';
export const loaderPath =
  '<path d="M12 2v4"></path><path d="M12 18v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="m16.24 7.76 2.83-2.83"></path>';

export function playIcon(size: number, color: string): string {
  return iconSvg(playPath, size, color, color);
}

export function pauseIcon(size: number, color: string): string {
  return iconSvg(pausePath, size, color, color);
}

export function skipForwardIcon(size: number, color: string): string {
  return iconSvg(skipForwardPath, size, color, color);
}

export function skipBackIcon(size: number, color: string): string {
  return iconSvg(skipBackPath, size, color, color);
}

export function volumeIcon(volume: number, size: number, color: string): string {
  if (volume === 0) return iconSvg(volumeXPath, size, color);
  if (volume < 1) return iconSvg(volume1Path, size, color);
  return iconSvg(volume2Path, size, color);
}

export function loaderIcon(size: number, color: string): string {
  return iconSvg(loaderPath, size, color);
}