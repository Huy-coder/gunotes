import { NextResponse } from "next/server";
import {
  generateQuizLocally,
  gradeBlurtingLocally,
} from "@/lib/ai/study-assistant";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import type { Note } from "@/types/study";

export const dynamic = "force-dynamic";

function noteToPlainContext(note: Note): string {
  const lines = [`Tiêu đề: ${note.title}`];
  for (const b of note.blocks) {
    if (b.type === "diagram" || b.type === "image") continue;
    const cue = stripStudyMarkup(b.cue).trim();
    const content = stripStudyMarkup(b.content).trim();
    if (cue || content) {
      lines.push(`- [${b.type}] ${cue ? `${cue}: ` : ""}${content}`);
    }
  }
  if (note.summary.trim()) {
    lines.push(`Tóm tắt: ${stripStudyMarkup(note.summary)}`);
  }
  return lines.join("\n").slice(0, 6000);
}

async function callGeminiJson(prompt: string): Promise<unknown | null> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35,
          },
        }),
      }
    );

    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: "grade-blurting" | "generate-quiz";
      note?: Note;
      dumpText?: string;
    };

    const note = body.note;
    if (!note || !Array.isArray(note.blocks)) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu ghi chú hợp lệ." },
        { status: 400 }
      );
    }

    if (body.action === "grade-blurting") {
      const dumpText = body.dumpText ?? "";
      const ctx = noteToPlainContext(note);
      const aiRaw = (await callGeminiJson(
        `Bạn là trợ lý học tập nghiêm túc và súc tích. Hãy chấm điểm bài nhớ lại (Blurting) của học sinh bằng tiếng Việt so với ghi chú gốc.\n\nGhi chú gốc:\n${ctx}\n\nBài học sinh tự nhớ lại:\n${dumpText.slice(
          0,
          3000
        )}\n\nTrả về JSON đúng schema:\n{\n  "score": number (0-100),\n  "coveredPoints": string[] (tối đa 5 ý nhớ đúng),\n  "missedPoints": string[] (tối đa 5 ý quan trọng bị quên/nhầm),\n  "advice": string (1-2 câu gợi ý ôn tập thực tế)\n}`
      )) as {
        score?: number;
        coveredPoints?: string[];
        missedPoints?: string[];
        advice?: string;
      } | null;

      if (
        aiRaw &&
        typeof aiRaw.score === "number" &&
        Array.isArray(aiRaw.missedPoints)
      ) {
        return NextResponse.json({
          source: "gemini",
          score: Math.max(0, Math.min(100, Math.round(aiRaw.score))),
          coveredPoints: Array.isArray(aiRaw.coveredPoints)
            ? aiRaw.coveredPoints.slice(0, 6)
            : [],
          missedPoints: aiRaw.missedPoints.slice(0, 6),
          advice: aiRaw.advice ?? "Hãy ôn kỹ các điểm còn sót bên trên.",
        });
      }

      return NextResponse.json({
        source: "local",
        ...gradeBlurtingLocally(note, dumpText),
      });
    }

    if (body.action === "generate-quiz") {
      const ctx = noteToPlainContext(note);
      const aiRaw = (await callGeminiJson(
        `Tạo 4 câu hỏi trắc nghiệm 4 lựa chọn bằng tiếng Việt kiểm tra hiểu bản chất từ ghi chú sau.\n\nGhi chú:\n${ctx}\n\nTrả về JSON đúng schema:\n{\n  "questions": [\n    {\n      "id": string,\n      "question": string,\n      "options": [string, string, string, string],\n      "correctIndex": number (0..3),\n      "explanation": string\n    }\n  ]\n}`
      )) as {
        questions?: Array<{
          id?: string;
          question?: string;
          options?: string[];
          correctIndex?: number;
          explanation?: string;
        }>;
      } | null;

      if (
        aiRaw &&
        Array.isArray(aiRaw.questions) &&
        aiRaw.questions.length > 0 &&
        aiRaw.questions.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctIndex === "number"
        )
      ) {
        return NextResponse.json({
          source: "gemini",
          questions: aiRaw.questions.slice(0, 5),
        });
      }

      return NextResponse.json({
        source: "local",
        questions: generateQuizLocally(note),
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Lỗi xử lý yêu cầu AI học tập." },
      { status: 500 }
    );
  }
}
