"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Palette,
  Sparkles,
} from "lucide-react";
import { StickerArt } from "@/components/stickers/StickerArt";
import { HighlightText } from "@/components/ui/HighlightText";
import { useAppStore } from "@/store/useAppStore";
import type { StickerId } from "@/types/study";

const HERO_STICKERS: StickerId[] = ["sparkle", "coffee", "cat", "cyber"];

export default function LandingPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const [demoBlur, setDemoBlur] = useState(true);
  const [demoTrapRevealed, setDemoTrapRevealed] = useState(false);
  const [stickerIdx, setStickerIdx] = useState(0);

  const currentSticker = HERO_STICKERS[stickerIdx];

  return (
    <div className="paper-dot min-h-screen text-[var(--ink-primary)]">
      {/* Sticky Minimal Navbar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink-primary)]" />
            <span>GuNotes.</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--ink-muted)] md:flex">
            <a href="#cornell" className="hover:text-[var(--ink-primary)]">
              Phương pháp Cornell
            </a>
            <a href="#aesthetic" className="hover:text-[var(--ink-primary)]">
              Độ giao diện
            </a>
            <a href="#recall" className="hover:text-[var(--ink-primary)]">
              Ôn tập Active Recall
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink-primary)]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/workspace"
              className="rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90 sm:text-sm"
            >
              Mở sổ miễn phí
            </Link>
          </div>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>KHÔNG GIAN GHI CHÚ CHO THẾ HỆ HỌC BÁ CÓ GU</span>
          </div>

          <h1 className="mt-6 text-3xl leading-[1.18] font-bold tracking-tight sm:text-5xl">
            Ghi chép có hệ thống. <br className="hidden sm:block" />
            Học tập mang{" "}
            <span
              className="rounded-lg px-2 py-0.5 text-[var(--ink-primary)]"
              style={{ backgroundColor: "var(--sem-hl-bg)" }}
            >
              chất riêng.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
            Tạm biệt lối chép bài thụ động. Kết hợp khung{" "}
            <strong className="font-semibold text-[var(--ink-primary)]">
              Cornell 2 cột
            </strong>
            , mã hóa màu sắc, chế độ{" "}
            <strong className="font-semibold text-[var(--ink-primary)]">
              Che để nhớ (Blur Recall)
            </strong>{" "}
            và bộ giấy Minimal Paper dịu mắt.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90 sm:w-auto"
            >
              <span>Bắt đầu miễn phí với Google</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/onboarding"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-6 py-3 text-sm font-medium text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] sm:w-auto"
            >
              <BookOpen className="h-4 w-4" />
              <span>Bắt đầu học ngay</span>
            </Link>
          </div>
        </div>

        {/* Interactive Paper Sheet Showcase */}
        <div className="paper-shadow relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-[20px] border border-[var(--border-hairline)] bg-[var(--bg-paper)]">
          {/* Paper Top Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/70 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--sem-def-border)]" />
              <span>Giải tích 1 / Chương 2: Đạo hàm & L&apos;Hôpital</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDemoBlur((v) => !v);
                  setDemoTrapRevealed(false);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition ${
                  demoBlur
                    ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                }`}
              >
                {demoBlur ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                <span>{demoBlur ? "Đang Che bài (R)" : "Bật Che bài"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTheme(
                    theme === "minimal-paper" ? "cyber-kit" : "minimal-paper"
                  )
                }
                className="flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1 font-mono text-[11px] font-medium transition hover:border-[var(--ink-muted)]"
              >
                <Palette className="h-3 w-3" />
                <span>
                  {theme === "minimal-paper"
                    ? "Đổi sang Cyber-Kit"
                    : "Về Minimal Paper"}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Cornell Sheet */}
          <div className="paper-dot relative p-5 sm:p-8 sm:pl-12">
            {/* Loose-leaf punch holes on desktop */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 left-3 hidden flex-col justify-evenly sm:flex"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)]"
                />
              ))}
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  Quy tắc L&apos;Hôpital & Khử dạng vô định
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
                  <span>#toan-cao-cap</span>
                  <span>•</span>
                  <span>#thi-giua-ky</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setStickerIdx((idx) => (idx + 1) % HERO_STICKERS.length)
                }
                title="Bấm để đổi Sticker!"
                className="group flex flex-col items-center gap-0.5"
              >
                <StickerArt id={currentSticker} size={46} />
                <span className="font-mono text-[9px] text-[var(--ink-muted)]">
                  Bấm đổi sticker
                </span>
              </button>
            </div>

            {/* Responsive Cornell Split Preview */}
            <div className="mt-5 space-y-4">
              {/* Block 1: Definition */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:gap-6">
                <div className="sm:col-span-4 sm:border-r sm:border-[var(--border-hairline)] sm:pr-4">
                  <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                    Từ khóa gợi nhớ
                  </span>
                  <p className="mt-1 text-sm font-medium text-[var(--ink-primary)]">
                    Điều kiện bắt buộc để dùng L&apos;Hôpital?
                  </p>
                </div>
                <div className="sm:col-span-8">
                  <div
                    className="rounded-xl border p-3.5 text-sm leading-relaxed"
                    style={{
                      backgroundColor: "var(--sem-def-bg)",
                      borderColor: "var(--sem-def-border)",
                    }}
                  >
                    <span className="mb-1 inline-block font-mono text-[10px] font-bold tracking-wider uppercase">
                      ĐỊNH NGHĨA
                    </span>
                    <div>
                      <HighlightText text="Giới hạn phải có ==dạng vô định 0/0 hoặc ∞/∞== và mẫu số g'(x) ≠ 0 lân cận điểm xét." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 2: Trap with Interactive Blur Recall */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:gap-6">
                <div className="sm:col-span-4 sm:border-r sm:border-[var(--border-hairline)] sm:pr-4">
                  <p className="text-sm font-medium text-[var(--ink-primary)]">
                    Lỗi sai kinh điển khi đạo hàm phân thức?
                  </p>
                </div>
                <div className="sm:col-span-8">
                  <div
                    onClick={() => demoBlur && setDemoTrapRevealed((v) => !v)}
                    className={`relative rounded-xl border p-3.5 text-sm leading-relaxed transition ${
                      demoBlur ? "cursor-pointer" : ""
                    }`}
                    style={{
                      backgroundColor: "var(--sem-trap-bg)",
                      borderColor: "var(--sem-trap-border)",
                    }}
                  >
                    <span className="mb-1 inline-block font-mono text-[10px] font-bold tracking-wider uppercase">
                      BẪY HAY SAI
                    </span>
                    <div
                      className={
                        demoBlur && !demoTrapRevealed
                          ? "blur-recall-mask"
                          : "blur-recall-revealed"
                      }
                    >
                      <HighlightText text="Tuyệt đối KHÔNG dùng quy tắc thương (f/g)' — phải ==đạo hàm riêng tử và riêng mẫu==!" />
                    </div>
                    {demoBlur && !demoTrapRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                        <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-3 py-1 font-mono text-[11px] font-semibold shadow-xs">
                          Chạm để soi đáp án
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Philosophy Strip */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            id="cornell"
            className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5"
          >
            <div className="font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
              01 / CORNELL & COLOR-CODING
            </div>
            <h3 className="mt-2 text-base font-bold">Lọc từ khóa, bỏ chép vẹt</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
              Chia sẵn cột Từ khóa, Nội dung 5 màu ngữ nghĩa và ô Tóm tắt 3 dòng
              cuối trang. Tự động thích ứng gọn gàng trên màn hình điện thoại.
            </p>
          </div>

          <div
            id="recall"
            className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5"
          >
            <div className="font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
              02 / BLUR RECALL & DECK
            </div>
            <h3 className="mt-2 text-base font-bold">Che để nhớ trong 1 chạm</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
              Nhấn phím R để làm mờ toàn bộ phần giải thích, tự nhẩm lại từ cột
              câu hỏi rồi chạm từng khối để kiểm tra trí nhớ.
            </p>
          </div>

          <div
            id="aesthetic"
            className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5"
          >
            <div className="font-mono text-[11px] font-semibold text-[var(--ink-muted)]">
              03 / ĐỘ GIAO DIỆN CÓ GU
            </div>
            <h3 className="mt-2 text-base font-bold">Minimal Paper & Stickers</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
              Giấy kem dot-grid dịu mắt, sticker die-cut mở khóa theo chuỗi ngày
              học, đổi sang Cyber-Kit Dark bất kỳ lúc nào khi học đêm.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
