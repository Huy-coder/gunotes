import type {
  BinderCoverPattern,
  BinderCoverTone,
  BlockType,
  HighlightColor,
  NoteTemplate,
  PaperStyle,
  StudyPersona,
} from "@/types/study";

export const NOTE_TEMPLATE_META: Array<{
  id: NoteTemplate;
  label: string;
  shortDesc: string;
}> = [
  { id: "freeform", label: "Giấy tự do", shortDesc: "Viết thẳng lên trang giấy, không chia khung gò bó" },
  { id: "cornell", label: "Cornell", shortDesc: "2 cột Từ khóa + Nội dung + Tóm tắt" },
  { id: "outline", label: "Outline", shortDesc: "Dàn ý phân cấp gõ nhanh" },
  { id: "boxing", label: "Boxing", shortDesc: "Thẻ khối độc lập cho tư duy hình ảnh" },
  { id: "charting", label: "So sánh", shortDesc: "Bảng ma trận đối chiếu tiêu chí" },
  { id: "feynman", label: "Feynman", shortDesc: "Tự giảng đơn giản & lọc lỗ hổng" },
  { id: "split", label: "Split 50/50", shortDesc: "Chia đôi Đề/Giải hoặc Song ngữ 50/50" },
  { id: "todai", label: "Todai 3-Cột", shortDesc: "Sổ ĐH Tokyo: Kiến thức | Suy luận | Áp dụng" },
];

export const PAPER_STYLE_META: Array<{
  id: PaperStyle;
  label: string;
  hint: string;
}> = [
  { id: "lined", label: "Kẻ ngang", hint: "Viết dài thẳng sạch" },
  { id: "dot", label: "Chấm bi", hint: "Căn bảng & công thức" },
  { id: "grid", label: "Caro", hint: "Vẽ hình & đồ thị" },
  { id: "plain", label: "Trơn", hint: "Mindmap tự do 100%" },
];

export const STUDY_PERSONA_META: Array<{
  id: StudyPersona;
  name: string;
  tagline: string;
  desc: string;
  recommendedPaper: PaperStyle;
  recommendedTemplate: NoteTemplate;
}> = [
  {
    id: "flow",
    name: "Hệ Luồng (Hải)",
    tagline: "Có mũi tên là có đường",
    desc: "Học theo quy trình từng bước, checkpoint rõ ràng (Toán, Lý, Quy trình).",
    recommendedPaper: "dot",
    recommendedTemplate: "cornell",
  },
  {
    id: "layer",
    name: "Hệ Lớp (Lya)",
    tagline: "Tầng ý mạch lạc, hết lan man",
    desc: "Chia ý lớn → ý nhỏ → dẫn chứng rõ ràng (Văn, Lập luận, Luật).",
    recommendedPaper: "lined",
    recommendedTemplate: "outline",
  },
  {
    id: "visual",
    name: "Hệ Hình (Miu)",
    tagline: "Biến chữ thành hình & màu sắc",
    desc: "Sơ đồ mạng nhện, sticker, hộp màu trực quan (Sinh, Địa, Design).",
    recommendedPaper: "plain",
    recommendedTemplate: "boxing",
  },
  {
    id: "logic",
    name: "Hệ Logic (Khôi)",
    tagline: "Bóc cấu trúc, so sánh bản chất",
    desc: "Đối chiếu điểm giống/khác bằng bảng & Venn (Hóa, Anh, Kinh tế).",
    recommendedPaper: "grid",
    recommendedTemplate: "charting",
  },
];

export const HIGHLIGHT_COLORS: Array<{
  id: HighlightColor;
  label: string;
  cssVar: string;
}> = [
  { id: "y", label: "Vàng", cssVar: "var(--hl-yellow)" },
  { id: "b", label: "Xanh", cssVar: "var(--hl-blue)" },
  { id: "p", label: "Hồng", cssVar: "var(--hl-pink)" },
  { id: "g", label: "Lá", cssVar: "var(--hl-green)" },
];

export const SEMANTIC_META: Record<
  BlockType,
  {
    badge: string;
    bgVar: string;
    borderVar: string;
    shortcut: string;
    description: string;
  }
> = {
  def: {
    badge: "ĐỊNH NGHĨA",
    bgVar: "var(--sem-def-bg)",
    borderVar: "var(--sem-def-border)",
    shortcut: "@def",
    description: "Khái niệm cốt lõi & bản chất",
  },
  formula: {
    badge: "CÔNG THỨC",
    bgVar: "var(--sem-formula-bg)",
    borderVar: "var(--sem-formula-border)",
    shortcut: "@formula",
    description: "Quy tắc, công thức, biểu thức",
  },
  example: {
    badge: "VÍ DỤ",
    bgVar: "var(--sem-ex-bg)",
    borderVar: "var(--sem-ex-border)",
    shortcut: "@ex",
    description: "Bài tập mẫu & minh họa",
  },
  trap: {
    badge: "BẪY HAY SAI",
    bgVar: "var(--sem-trap-bg)",
    borderVar: "var(--sem-trap-border)",
    shortcut: "@trap",
    description: "Lưu ý dễ mất điểm khi thi",
  },
  text: {
    badge: "GHI CHÚ",
    bgVar: "var(--bg-elevated)",
    borderVar: "var(--border-hairline)",
    shortcut: "@note",
    description: "Ý tự do / diễn giải thêm",
  },
  diagram: {
    badge: "SƠ ĐỒ TRỰC QUAN",
    bgVar: "var(--bg-elevated)",
    borderVar: "var(--border-hairline)",
    shortcut: "@diagram",
    description: "Flowchart, Venn, Cây, Mạng nhện",
  },
};

export function getBinderToneVars(tone: BinderCoverTone): {
  bg: string;
  border: string;
} {
  switch (tone) {
    case "blue":
      return {
        bg: "var(--binder-blue-bg)",
        border: "var(--binder-blue-border)",
      };
    case "sage":
      return {
        bg: "var(--binder-sage-bg)",
        border: "var(--binder-sage-border)",
      };
    case "sand":
      return {
        bg: "var(--binder-sand-bg)",
        border: "var(--binder-sand-border)",
      };
    case "lavender":
      return {
        bg: "var(--binder-lavender-bg)",
        border: "var(--binder-lavender-border)",
      };
    case "terracotta":
      return {
        bg: "var(--binder-terracotta-bg)",
        border: "var(--binder-terracotta-border)",
      };
  }
}

export function getPaperClass(style: PaperStyle | BinderCoverPattern): string {
  if (style === "dot") return "paper-dot";
  if (style === "grid") return "paper-grid";
  if (style === "lined") return "paper-lined";
  return "paper-plain";
}
