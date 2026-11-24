"use client";

import React, { useEffect, useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import type { QuizQuestion } from "@/lib/ai/study-assistant";
import type { Note } from "@/types/study";

export function QuickQuizModal({
  open,
  note,
  onClose,
  onSaveWrongToFlashcard,
}: {
  open: boolean;
  note: Note;
  onClose: () => void;
  onSaveWrongToFlashcard: (q: QuizQuestion) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"gemini" | "local">("local");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const loadQuiz = async () => {
    setLoading(true);
    setAnswers({});
    try {
      const res = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-quiz", note }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          source?: "gemini" | "local";
          questions?: QuizQuestion[];
        };
        setSource(data.source ?? "local");
        setQuestions(data.questions ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, note.id]);

  if (!open) return null;

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-shadow flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[var(--ink-primary)]" />
            <div>
              <h2 className="text-sm font-bold">
                Trắc nghiệm nhanh: {note.title}
              </h2>
              <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                {source === "gemini"
                  ? "Sinh câu hỏi bằng Gemini AI"
                  : "Trích xuất thông minh từ từ khóa & Cloze trong trang"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadQuiz()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Tạo bộ khác</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-xs text-[var(--ink-muted)]">
              <Loader2 className="mb-2 h-5 w-5 animate-spin" />
              <span>Đang tạo câu hỏi trắc nghiệm từ trang ghi chú...</span>
            </div>
          ) : (
            questions.map((q, qIdx) => {
              const picked = answers[q.id];
              const isAnswered = picked !== undefined;
              const isCorrect = picked === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4"
                >
                  <div className="font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase">
                    Câu {qIdx + 1} / {questions.length}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold leading-relaxed">
                    {q.question}
                  </h3>

                  <div className="mt-3 space-y-1.5">
                    {q.options.map((opt, idx) => {
                      const isPicked = picked === idx;
                      const isRightOpt = idx === q.correctIndex;
                      let optionStyle: React.CSSProperties | undefined;
                      if (isAnswered) {
                        if (isRightOpt) {
                          optionStyle = {
                            backgroundColor: "var(--sem-ex-bg)",
                            borderColor: "var(--sem-ex-border)",
                          };
                        } else if (isPicked) {
                          optionStyle = {
                            backgroundColor: "var(--sem-trap-bg)",
                            borderColor: "var(--sem-trap-border)",
                          };
                        }
                      }
                      return (
                        <button
                          key={`${q.id}-${idx}`}
                          type="button"
                          disabled={isAnswered}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: idx }))
                          }
                          style={optionStyle}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-xs transition hover:border-[var(--ink-primary)] disabled:cursor-default"
                        >
                          <span>
                            <strong className="mr-2 font-mono">
                              {String.fromCharCode(65 + idx)}.
                            </strong>
                            {opt}
                          </span>
                          {isAnswered && isRightOpt && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                          )}
                          {isAnswered && isPicked && !isRightOpt && (
                            <XCircle className="h-4 w-4 shrink-0 text-rose-700" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-desk)] px-3 py-2 text-xs">
                      <span className="text-[var(--ink-muted)]">
                        <strong className="text-[var(--ink-primary)]">
                          Giải thích:{" "}
                        </strong>
                        {q.explanation}
                      </span>
                      {!isCorrect && (
                        <button
                          type="button"
                          onClick={() => onSaveWrongToFlashcard(q)}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
                        >
                          <BookmarkPlus className="h-3 w-3" />
                          <span>Lưu câu sai vào /review</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {questions.length > 0 && answeredCount === questions.length && (
          <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 text-xs sm:px-6">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-4 w-4 text-[var(--accent-ring)]" />
              <span>
                Kết quả: {correctCount} / {questions.length} câu đúng (
                {Math.round((correctCount / questions.length) * 100)}%)
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)]"
            >
              Xong
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
