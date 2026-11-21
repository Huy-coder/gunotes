export type ThemeId = "minimal-paper" | "cyber-kit" | "blueprint" | "cozy-lofi";

export type PaperStyle = "dot" | "grid" | "lined" | "plain";

export type NoteFont = "sans" | "serif";

export type BinderCoverTone = "blue" | "sage" | "sand" | "lavender" | "terracotta";

export type BinderCoverPattern = PaperStyle;

export type BlockType = "def" | "formula" | "example" | "trap" | "text" | "diagram";

export type NoteTemplate =
  | "freeform"
  | "cornell"
  | "outline"
  | "boxing"
  | "charting"
  | "feynman"
  | "split"
  | "todai";

export type HighlightColor = "y" | "b" | "p" | "g";

export type StudyPersona = "flow" | "layer" | "visual" | "logic";

export type FlowchartDiagram = {
  kind: "flowchart";
  steps: Array<{ id: string; label: string; note?: string }>;
};

export type VennDiagram = {
  kind: "venn";
  leftTitle: string;
  rightTitle: string;
  leftOnly: string[];
  shared: string[];
  rightOnly: string[];
};

export type TreeDiagram = {
  kind: "tree";
  root: string;
  branches: Array<{
    id: string;
    label: string;
    items: string[];
    color: HighlightColor;
  }>;
};

export type SpiderDiagram = {
  kind: "spider";
  center: string;
  nodes: Array<{
    id: string;
    label: string;
    detail?: string;
    color: HighlightColor;
  }>;
};

export type GraphLayoutMode = "mindmap" | "tree" | "radial" | "flowchart";

export interface GraphNodeItem {
  id: string;
  label: string;
  detail?: string;
  color: HighlightColor;
  x: number;
  y: number;
  isRoot?: boolean;
  parentId?: string;
}

export interface GraphEdgeItem {
  id: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
}

export type GraphDiagram = {
  kind: "graph";
  layout: GraphLayoutMode;
  nodes: GraphNodeItem[];
  edges: GraphEdgeItem[];
  sourceDiagram?: FlowchartDiagram | VennDiagram | TreeDiagram | SpiderDiagram;
  collapsed?: boolean;
  hasGraphEdits?: boolean;
};

export interface NoteBlockLink {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  label?: string;
}

export type DiagramData =
  | FlowchartDiagram
  | VennDiagram
  | TreeDiagram
  | SpiderDiagram
  | GraphDiagram;

export type StickerId =
  | "coffee"
  | "sparkle"
  | "cat"
  | "cursor"
  | "bookmark"
  | "chart"
  | "lamp"
  | "cyber";

export interface PlacedSticker {
  id: string;
  stickerId: StickerId;
  /** Percentage coordinates (0-100) relative to binder cover (3:4) */
  xPct: number;
  yPct: number;
  rotation: number;
}

export type DiagramViewMode = "card" | "canvas";

export interface CornellBlock {
  id: string;
  cue: string;
  type: BlockType;
  title?: string;
  content: string;
  action?: string;
  diagram?: DiagramData;
  canvasGraph?: GraphDiagram;
  diagramViewMode?: DiagramViewMode;
  blurrable?: boolean;
}

export interface Note {
  id: string;
  binderId: string;
  title: string;
  template: NoteTemplate;
  paperStyle: PaperStyle;
  tags: string[];
  blocks: CornellBlock[];
  blockLinks?: NoteBlockLink[];
  summary: string;
  headerStickerId?: StickerId | null;
  updatedAt: string;
  updatedMinutesAgo: number;
  isPinned?: boolean;
}

export interface Binder {
  id: string;
  title: string;
  subtitle: string;
  subjectTag: string;
  coverTone: BinderCoverTone;
  coverPattern: BinderCoverPattern;
  stickers: PlacedSticker[];
  masteryPercent: number;
  sortOrder: number;
}

export interface Flashcard {
  id: string;
  binderId: string;
  noteId: string;
  noteTitle: string;
  type: Exclude<BlockType, "text" | "diagram">;
  front: string;
  back: string;
  tip?: string;
  dueLabel: string;
  isDue: boolean;
  intervalDays: number;
  reps: number;
}

export interface FocusTask {
  id: string;
  label: string;
  done: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  streakDays: number;
  weeklyFocusMinutes: number;
  todayFocusMinutes: number;
  unlockedStickers: StickerId[];
  studyPersona?: StudyPersona;
  onboarded: boolean;
}
