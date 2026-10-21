export interface PlayerSnapshot {
  available: boolean;
  playbackRate: number;
}

export interface PlayerPort {
  snapshot(): PlayerSnapshot;
  setPlaybackRate(rate: number): void;
  subscribe(listener: (state: PlayerSnapshot) => void): () => void;
}

export interface Tool {
  id: string;
  mount(container: HTMLElement, player: PlayerPort): () => void;
}

export type ToolbarPosition = "player" | "bottom";

export interface ToolbarLayout {
  setPosition(position: ToolbarPosition): void;
  dispose(): void;
}
