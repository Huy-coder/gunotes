import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Thiếu tệp âm thanh gửi lên." },
        { status: 400 }
      );
    }

    if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Độ dài tệp ghi âm không hợp lệ (tối đa 10MB)." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Trình duyệt chưa hỗ trợ Web Speech API trực tiếp và máy chủ chưa bật GEMINI_API_KEY. Hãy mở bằng Chrome, Edge hoặc Safari để dùng giọng nói tiếng Việt miễn phí.",
        },
        { status: 503 }
      );
    }

    const buf = Buffer.from(await audio.arrayBuffer());
    const base64Audio = buf.toString("base64");
    const mimeType = audio.type || "audio/webm";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "Chép lời chính xác đoạn âm thanh sau CHỈ BẰNG TIẾNG VIỆT (vi-VN), giữ nguyên ý, thêm dấu câu tự nhiên, tuyệt đối không dịch sang tiếng Anh hay ngôn ngữ khác. Chỉ trả về phần văn bản đã chép lời, không thêm giải thích.",
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: "Không nhận diện được đoạn ghi âm. Vui lòng thử lại." },
          { status: 502 }
        );
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const transcript =
        json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

      return NextResponse.json({
        transcript,
        lang: "vi-VN",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json(
      { error: "Lỗi xử lý âm thanh giọng nói." },
      { status: 500 }
    );
  }
}
