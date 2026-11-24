import { stripStudyMarkup } from "../highlight/highlight-markup";
import type { Note } from "../../types/study";

export interface BlurtingGradeResult {
  score: number;
  coveredPoints: string[];
  missedPoints: string[];
  advice: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function normalizeWords(text: string): Set<string> {
  return new Set(
    stripStudyMarkup(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  );
}

function extractKeyPoints(note: Note): string[] {
  const points: string[] = [];
  const seen = new Set<string>();

  const pushPoint = (raw: string) => {
    const clean = stripStudyMarkup(raw).trim();
    if (clean.length < 2) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    points.push(clean);
  };

  for (const blk of note.blocks) {
    if (blk.type === "diagram" || blk.type === "image") continue;
    for (const m of blk.content.matchAll(/\{\{([\s\S]+?)\}\}/g)) {
      pushPoint(m[1]);
    }
    for (const m of blk.content.matchAll(/==(?:[ybpg]:)?([\s\S]+?)==/g)) {
      pushPoint(m[1]);
    }
    if (blk.cue.trim()) pushPoint(blk.cue);
    if (points.length < 4 && blk.content.trim()) {
      const firstLine = stripStudyMarkup(blk.content).split(/[\n.]/)[0]?.trim();
      if (firstLine && firstLine.length >= 4) pushPoint(firstLine.slice(0, 90));
    }
  }

  if (points.length === 0 && note.summary.trim()) {
    pushPoint(note.summary.slice(0, 90));
  }

  return points.slice(0, 8);
}

export function gradeBlurtingLocally(
  note: Note,
  dumpText: string
): BlurtingGradeResult {
  const keyPoints = extractKeyPoints(note);
  const dumpWords = normalizeWords(dumpText);
  const dumpLower = dumpText.toLowerCase();

  if (keyPoints.length === 0) {
    const len = dumpText.trim().length;
    return {
      score: len > 20 ? 75 : 30,
      coveredPoints: len > 0 ? ["Đã tự diễn đạt lại ý chính của bài"] : [],
      missedPoints: ["Trang gốc chưa có đủ từ khóa tô màu hoặc khối kiến thức để đối chiếu."],
      advice:
        "Hãy tô màu ==từ khóa== hoặc thêm ô {{Cloze}} trong trang note để lần sau chấm đối chiếu sát hơn.",
    };
  }

  const coveredPoints: string[] = [];
  const missedPoints: string[] = [];

  for (const pt of keyPoints) {
    const ptWords = Array.from(normalizeWords(pt));
    if (dumpLower.includes(pt.toLowerCase())) {
      coveredPoints.push(pt);
      continue;
    }
    if (ptWords.length > 0) {
      const hits = ptWords.filter((w) => dumpWords.has(w)).length;
      if (hits / ptWords.length >= 0.5) {
        coveredPoints.push(pt);
        continue;
      }
    }
    missedPoints.push(pt);
  }

  const score = Math.round((coveredPoints.length / keyPoints.length) * 100);
  const advice =
    score >= 80
      ? "Rất vững! Bạn nhớ gần như toàn bộ ý cốt lõi — hãy ôn lại phần còn sót 1 lượt là chắc điểm."
      : score >= 50
      ? "Khá ổn! Bạn đã nắm được khung chính, nên lưu các ý còn thiếu thành khối @trap hoặc Flashcard."
      : "Bạn còn bỏ sót nhiều khái niệm quan trọng. Hãy bấm lưu từng lỗ hổng bên dưới và dùng chế độ Che để nhớ.";

  return { score, coveredPoints, missedPoints, advice };
}

export function generateQuizLocally(note: Note): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const poolAnswers: string[] = [];

  for (const blk of note.blocks) {
    for (const m of blk.content.matchAll(/\{\{([\s\S]+?)\}\}/g)) {
      const t = m[1].trim();
      if (t) poolAnswers.push(t);
    }
    for (const m of blk.content.matchAll(/==(?:[ybpg]:)?([\s\S]+?)==/g)) {
      const t = m[1].trim();
      if (t) poolAnswers.push(t);
    }
  }

  const fallbackDistractors = [
    "Điều kiện biên không xác định",
    "Giá trị xấp xỉ tuyến tính",
    "Hệ số chuẩn hóa mặc định",
    "Trường hợp ngoại lệ bỏ qua",
  ];

  const pickDistractors = (answer: string): string[] => {
    const candidates = [...poolAnswers, ...fallbackDistractors].filter(
      (c) => c.toLowerCase() !== answer.toLowerCase()
    );
    const unique: string[] = [];
    for (const c of candidates) {
      if (!unique.includes(c)) unique.push(c);
      if (unique.length >= 3) break;
    }
    return unique;
  };

  // 1. Cloze & highlighted phrase questions
  for (const blk of note.blocks) {
    if (blk.type === "diagram" || blk.type === "image") continue;
    const raw = blk.content.trim();
    if (!raw) continue;

    const cloze = /\{\{([\s\S]+?)\}\}/.exec(raw);
    if (cloze) {
      const ans = cloze[1].trim();
      const stem = stripStudyMarkup(
        raw.replace(cloze[0], "______")
      ).slice(0, 180);
      const distractors = pickDistractors(ans);
      const options = [ans, ...distractors];
      const rotate = questions.length % options.length;
      const rotated = [
        ...options.slice(rotate),
        ...options.slice(0, rotate),
      ];
      questions.push({
        id: `q-${questions.length + 1}`,
        question: `Điền cụm từ chính xác vào chỗ trống: "${stem}"`,
        options: rotated,
        correctIndex: rotated.indexOf(ans),
        explanation: stripStudyMarkup(raw),
      });
    } else if (blk.cue.trim() && stripStudyMarkup(raw).length > 3) {
      const ans = stripStudyMarkup(raw).split("\n")[0].slice(0, 110);
      const distractors = pickDistractors(ans);
      const options = [ans, ...distractors];
      const rotate = (questions.length + 1) % options.length;
      const rotated = [
        ...options.slice(rotate),
        ...options.slice(0, rotate),
      ];
      questions.push({
        id: `q-${questions.length + 1}`,
        question: blk.cue.trim(),
        options: rotated,
        correctIndex: rotated.indexOf(ans),
        explanation: stripStudyMarkup(raw),
      });
    }

    if (questions.length >= 5) break;
  }

  if (questions.length === 0) {
    const fallbackAns =
      stripStudyMarkup(note.summary).trim() ||
      note.title ||
      "Nội dung trọng tâm của trang ghi chú";
    const opts = [
      fallbackAns.slice(0, 110),
      ...fallbackDistractors.slice(0, 3),
    ];
    questions.push({
      id: "q-1",
      question: `Ý cốt lõi nhất cần nhớ trong "${note.title}" là gì?`,
      options: opts,
      correctIndex: 0,
      explanation: fallbackAns,
    });
  }

  return questions;
}
