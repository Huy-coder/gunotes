import type { BlockType, DiagramData } from "@/types/study";

export type MobileTab = "all" | "cues" | "summary";

export interface SelectionPopupState {
  blockId: string;
  text: string;
  x: number;
  y: number;
}

export interface HighlightUndoEntry {
  blockId: string;
  prevContent: string;
}

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function extractFirstLatex(content: string): string {
  const display = /\$\$([\s\S]+?)\$\$/.exec(content);
  if (display) return display[1].trim();
  const inline = /\$([^$\n]+?)\$/.exec(content);
  if (inline) return inline[1].trim();
  return "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1";
}

export function getDefaultBlockPayload(type: BlockType): {
  cue: string;
  content: string;
} {
  if (type === "diagram") {
    return {
      cue: "Sơ đồ trực quan minh họa?",
      content: "Sơ đồ luồng từng bước",
    };
  }
  return { cue: "", content: "" };
}

export function getBlockPlaceholder(type: BlockType): string {
  const placeholders: Record<BlockType, string> = {
    text: "Bắt đầu viết lên trang giấy... (gõ / để chèn khối, ảnh hoặc sơ đồ)",
    def: "Viết định nghĩa cốt lõi bằng ngôn từ của bạn...",
    formula: "Nhập công thức $...$ hoặc bấm fx bên dưới...",
    example: "Ghi ví dụ minh họa hoặc bài tập mẫu...",
    trap: "Ghi lỗi sai hay mất điểm khi làm bài...",
    diagram: "Mô tả sơ đồ...",
    image: "Chú thích hình ảnh...",
  };
  return placeholders[type];
}

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  action:
    | { kind: "block"; blockType: BlockType }
    | { kind: "diagram"; diagramKind: DiagramData["kind"] }
    | { kind: "formula" }
    | { kind: "image" };
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "text",
    label: "Chữ thường",
    description: "Viết tự do lên trang giấy",
    keywords: ["chu", "text", "note", "ghi chu", "thuong"],
    action: { kind: "block", blockType: "text" },
  },
  {
    id: "def",
    label: "Định nghĩa",
    description: "Khái niệm cốt lõi & bản chất",
    keywords: ["def", "dn", "dinh nghia", "khai niem"],
    action: { kind: "block", blockType: "def" },
  },
  {
    id: "formula",
    label: "Công thức",
    description: "Quy tắc & công thức KaTeX",
    keywords: ["formula", "ct", "cong thuc", "toan"],
    action: { kind: "block", blockType: "formula" },
  },
  {
    id: "fx",
    label: "Bàn phím toán fx",
    description: "Mở trình soạn công thức trực quan",
    keywords: ["fx", "latex", "katex", "math", "sigma"],
    action: { kind: "formula" },
  },
  {
    id: "image",
    label: "Chèn ảnh / Chụp bảng",
    description: "Tải ảnh, chụp đề bài & khoanh chú thích",
    keywords: ["anh", "img", "image", "photo", "camera", "chup"],
    action: { kind: "image" },
  },
  {
    id: "example",
    label: "Ví dụ",
    description: "Bài tập mẫu & minh họa",
    keywords: ["ex", "vd", "vi du", "bai tap"],
    action: { kind: "block", blockType: "example" },
  },
  {
    id: "trap",
    label: "Bẫy hay sai",
    description: "Lưu ý dễ mất điểm khi thi",
    keywords: ["trap", "bay", "loi", "sai"],
    action: { kind: "block", blockType: "trap" },
  },
  {
    id: "flowchart",
    label: "Sơ đồ Luồng",
    description: "Chuỗi bước tiến trình (Flowchart)",
    keywords: ["flow", "luong", "quy trinh", "so do"],
    action: { kind: "diagram", diagramKind: "flowchart" },
  },
  {
    id: "graph",
    label: "Sơ đồ Nhánh Đa tầng",
    description: "Canvas Zoom / Pan & nối chéo",
    keywords: ["graph", "mindmap", "nhanh", "canvas"],
    action: { kind: "diagram", diagramKind: "graph" },
  },
  {
    id: "venn",
    label: "Biểu đồ Venn",
    description: "So sánh Giống & Khác nhau",
    keywords: ["venn", "so sanh"],
    action: { kind: "diagram", diagramKind: "venn" },
  },
  {
    id: "tree",
    label: "Sơ đồ Cây",
    description: "Phân loại nhánh hoặc tóm tắt chương",
    keywords: ["tree", "cay", "phan loai"],
    action: { kind: "diagram", diagramKind: "tree" },
  },
  {
    id: "spider",
    label: "Sơ đồ Mạng nhện",
    description: "Tâm chủ đề tỏa từ khóa",
    keywords: ["spider", "mang nhen"],
    action: { kind: "diagram", diagramKind: "spider" },
  },
];

export const DIAGRAM_PRESET_META: Record<
  DiagramData["kind"],
  { title: string; cue: string; toast: string }
> = {
  graph: {
    title: "BẢN ĐỒ NHÁNH ĐA TẦNG",
    cue: "Sơ đồ nhánh đa tầng & liên kết chéo?",
    toast: "Đã chèn Canvas Sơ đồ Đa tầng (Zoom / Chẻ nhánh / Nối chéo)",
  },
  flowchart: {
    title: "SƠ ĐỒ LUỒNG",
    cue: "Quy trình / Chuỗi diễn biến từng bước?",
    toast: "Đã chèn Sơ đồ Luồng (Flowchart)",
  },
  venn: {
    title: "BIỂU ĐỒ VENN",
    cue: "So sánh điểm giống & khác nhau?",
    toast: "Đã chèn Biểu đồ Venn (So sánh Logic)",
  },
  tree: {
    title: "SƠ ĐỒ CÂY",
    cue: "Phân loại nhánh hoặc tổng quan chương?",
    toast: "Đã chèn Sơ đồ Cây (Tree Diagram)",
  },
  spider: {
    title: "SƠ ĐỒ MẠNG NHỆN",
    cue: "Mổ xẻ từ khóa trọng tâm đối tượng?",
    toast: "Đã chèn Sơ đồ Mạng Nhện (Spider Map)",
  },
};
