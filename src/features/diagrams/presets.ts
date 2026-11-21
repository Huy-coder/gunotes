import { createMultiLevelGraphPreset } from "@/lib/graph-layout";
import type { DiagramData } from "@/types/study";

export function createDiagramPreset(kind: DiagramData["kind"]): DiagramData {
  switch (kind) {
    case "flowchart":
      return {
        kind: "flowchart",
        steps: [
          {
            id: `fs-${Date.now()}-1`,
            label: "Bước 1: Đọc dữ kiện",
            note: "Xác định từ khóa",
          },
          {
            id: `fs-${Date.now()}-2`,
            label: "Bước 2: Chọn công thức",
            note: "Kiểm tra điều kiện",
          },
          {
            id: `fs-${Date.now()}-3`,
            label: "Bước 3: Kết luận",
            note: "Đối chiếu bẫy",
          },
        ],
      };
    case "venn":
      return {
        kind: "venn",
        leftTitle: "Khái niệm A",
        rightTitle: "Khái niệm B",
        leftOnly: ["Đặc điểm riêng A"],
        shared: ["Điểm giống nhau cốt lõi"],
        rightOnly: ["Đặc điểm riêng B"],
      };
    case "tree":
      return {
        kind: "tree",
        root: "Chủ đề chương",
        branches: [
          {
            id: `tb-${Date.now()}-1`,
            label: "Nhánh 1: Bối cảnh",
            items: ["Từ khóa 1", "Từ khóa 2"],
            color: "b",
          },
          {
            id: `tb-${Date.now()}-2`,
            label: "Nhánh 2: Nội dung chính",
            items: ["Từ khóa 3", "Từ khóa 4"],
            color: "y",
          },
          {
            id: `tb-${Date.now()}-3`,
            label: "Nhánh 3: Kết quả / Ý nghĩa",
            items: ["Từ khóa 5"],
            color: "g",
          },
        ],
      };
    case "graph":
      return createMultiLevelGraphPreset("mindmap");
    case "spider":
      return {
        kind: "spider",
        center: "Đối tượng trung tâm",
        nodes: [
          {
            id: `sn-${Date.now()}-1`,
            label: "Cấu tạo",
            detail: "Ghi ngắn 3-5 từ",
            color: "b",
          },
          {
            id: `sn-${Date.now()}-2`,
            label: "Cơ chế",
            detail: "Nguyên lý hoạt động",
            color: "y",
          },
          {
            id: `sn-${Date.now()}-3`,
            label: "Vai trò",
            detail: "Ứng dụng thực tế",
            color: "g",
          },
          {
            id: `sn-${Date.now()}-4`,
            label: "Lưu ý thi",
            detail: "Điểm dễ nhầm",
            color: "p",
          },
        ],
      };
  }
}
