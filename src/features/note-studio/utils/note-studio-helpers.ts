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
  const defaults: Record<BlockType, { cue: string; content: string }> = {
    def: {
      cue: "Khái niệm / Bản chất cốt lõi là gì?",
      content:
        "Nhập định nghĩa ngắn gọn bằng ==y:từ khóa chính== (bôi đen để tô thêm màu).",
    },
    formula: {
      cue: "Công thức hoặc quy tắc ghi nhớ?",
      content: "$$f(x) = \\frac{a}{b}$$",
    },
    example: {
      cue: "Ví dụ minh họa thực tế?",
      content: "Tình huống áp dụng nhanh...",
    },
    trap: {
      cue: "Bẫy hay mất điểm khi làm bài?",
      content: "Cảnh báo ==p:lỗi sai thường gặp==...",
    },
    text: {
      cue: "Ý bổ sung",
      content: "Ghi chú thêm tại đây...",
    },
    diagram: {
      cue: "Sơ đồ trực quan minh họa?",
      content: "Sơ đồ luồng từng bước",
    },
  };
  return defaults[type];
}

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
