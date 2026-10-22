export const VIDEO_CONTROLS = [
  { id: "brightness", label: "Brightness", min: 50, max: 150 },
  { id: "contrast", label: "Contrast", min: 50, max: 150 },
  { id: "saturation", label: "Saturation", min: 0, max: 200 },
  { id: "zoom", label: "Zoom", min: 100, max: 150 },
] as const;

export type VideoControl = (typeof VIDEO_CONTROLS)[number]["id"];
export type VideoFilterSettings = Record<VideoControl, number> & {
  mirror: boolean;
};
export const DEFAULT_VIDEO_FILTERS: VideoFilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  zoom: 100,
  mirror: false,
};

export function parseVideoFilters(saved: unknown): VideoFilterSettings {
  const record =
    saved && typeof saved === "object"
      ? (saved as Record<string, unknown>)
      : {};
  const settings = { ...DEFAULT_VIDEO_FILTERS, mirror: record.mirror === true };
  for (const control of VIDEO_CONTROLS) {
    const value = record[control.id];
    if (typeof value === "number" && Number.isFinite(value))
      settings[control.id] = Math.max(
        control.min,
        Math.min(control.max, Math.round(value)),
      );
  }
  return settings;
}

export function videoFilterCss(settings: VideoFilterSettings): string {
  return [
    settings.brightness !== 100 ? `brightness(${settings.brightness}%)` : "",
    settings.contrast !== 100 ? `contrast(${settings.contrast}%)` : "",
    settings.saturation !== 100 ? `saturate(${settings.saturation}%)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface VideoFiltersState {
  available: boolean;
  enabled: boolean;
  settings: VideoFilterSettings;
}

export interface VideoFiltersPort {
  snapshot(): VideoFiltersState;
  setEnabled(enabled: boolean): void;
  setValue(control: VideoControl, value: number): void;
  setMirror(mirror: boolean): void;
  reset(): void;
  subscribe(listener: (state: VideoFiltersState) => void): () => void;
}
