"use client";

import React from "react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import type { MobileTab } from "@/features/note-studio/utils/note-studio-helpers";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import type { CornellBlock, NoteTemplate } from "@/types/study";

export function NoteTemplateLayouts({
  noteId,
  activeTemplate,
  mobileTab,
  blocks,
  blurMode,
  brushMode,
  onClickPaperTail,
  onUpdateBlock,
  renderCard,
}: {
  noteId: string;
  activeTemplate: NoteTemplate;
  mobileTab: MobileTab;
  blocks: CornellBlock[];
  blurMode: boolean;
  brushMode: boolean;
  onClickPaperTail: () => void;
  onUpdateBlock: (
    noteId: string,
    blockId: string,
    patch: Partial<CornellBlock>
  ) => void;
  renderCard: (
    block: CornellBlock,
    options?: { compact?: boolean; hideBadge?: boolean }
  ) => React.ReactNode;
}) {
  const renderPaperTail = () =>
    !blurMode && !brushMode ? (
      <div
        onClick={onClickPaperTail}
        className="no-print group/tail mt-2 flex min-h-[140px] cursor-text items-start rounded-xl px-2 pt-3 transition hover:bg-[var(--ink-primary)]/[0.02]"
      >
        <span className="font-mono text-xs text-[var(--ink-muted)]/45 transition group-hover/tail:text-[var(--ink-muted)]/80 select-none">
          Chạm vào trang giấy để viết tiếp...
        </span>
      </div>
    ) : (
      <div className="min-h-[80px]" />
    );

  if (activeTemplate === "freeform") {
    return (
      <div className="mt-4 space-y-2.5">
        {blocks.map((block) => (
          <div key={block.id} className="group">
            {renderCard(block)}
          </div>
        ))}
        {renderPaperTail()}
      </div>
    );
  }

  if (activeTemplate === "cornell") {
    return (
      <>
        <div className="mt-6 hidden lg:block">
          <div className="mb-3 grid grid-cols-12 gap-6 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            <div className="col-span-4 border-r border-[var(--border-hairline)] pr-4">
              TỪ KHÓA & CÂU HỎI GỢI NHỚ (28%)
            </div>
            <div className="col-span-8">NỘI DUNG CHÍNH & MÃ HÓA MÀU (72%)</div>
          </div>

          <div className="space-y-4">
            {blocks.map((block) => (
              <div key={block.id} className="group grid grid-cols-12 gap-6">
                <div className="col-span-4 border-r border-[var(--border-hairline)] pr-4">
                  <AutoResizeTextarea
                    value={block.cue}
                    onChange={(e) =>
                      onUpdateBlock(noteId, block.id, { cue: e.target.value })
                    }
                    className="w-full bg-transparent font-sans text-[16px] leading-relaxed font-medium text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)] sm:text-sm"
                    placeholder="Câu hỏi / Từ khóa..."
                  />
                </div>
                <div className="col-span-8">{renderCard(block)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3.5 lg:hidden">
          {mobileTab !== "summary" &&
            blocks.map((block) => (
              <div
                key={block.id}
                className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/70 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                      TỪ KHÓA / CÂU HỎI
                    </span>
                    <AutoResizeTextarea
                      value={block.cue}
                      placeholder="Câu hỏi / Từ khóa..."
                      onChange={(e) =>
                        onUpdateBlock(noteId, block.id, { cue: e.target.value })
                      }
                      className="mt-0.5 w-full bg-transparent text-[16px] font-medium text-[var(--ink-primary)] outline-none sm:text-sm"
                    />
                  </div>
                </div>
                {mobileTab === "all" && renderCard(block)}
              </div>
            ))}
        </div>
        {mobileTab !== "summary" && renderPaperTail()}
      </>
    );
  }

  if (activeTemplate === "outline") {
    return (
      <div className="mt-6 space-y-4">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          DÀN Ý PHÂN CẤP (OUTLINE METHOD)
        </div>
        <div className="space-y-4 border-l-2 border-[var(--border-hairline)] pl-4 sm:pl-5">
          {blocks.map((block, idx) => (
            <div key={block.id} className="group relative space-y-1.5">
              <span
                aria-hidden="true"
                className="absolute top-2 -left-[22px] h-2.5 w-2.5 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-paper)] sm:-left-[26px]"
              />
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--ink-muted)]">
                  {idx + 1}.
                </span>
                <AutoResizeTextarea
                  value={block.cue}
                  onChange={(e) =>
                    onUpdateBlock(noteId, block.id, { cue: e.target.value })
                  }
                  className="w-full bg-transparent font-sans text-sm font-bold text-[var(--ink-primary)] outline-none"
                />
              </div>
              <div className="pl-4 sm:pl-5">
                {renderCard(block, { compact: true })}
              </div>
            </div>
          ))}
        </div>
        {renderPaperTail()}
      </div>
    );
  }

  if (activeTemplate === "boxing") {
    return (
      <div className="mt-6 space-y-3">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          ĐÓNG HỘP KHỐI KIẾN THỨC (BOXING METHOD)
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/75 p-3.5"
            >
              <div className="mb-2.5 border-b border-dashed border-[var(--border-hairline)] pb-2">
                <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                  CHỦ ĐỀ HỘP
                </span>
                <AutoResizeTextarea
                  value={block.cue}
                  onChange={(e) =>
                    onUpdateBlock(noteId, block.id, { cue: e.target.value })
                  }
                  className="mt-0.5 w-full bg-transparent font-sans text-sm font-bold outline-none"
                />
              </div>
              {renderCard(block, { compact: true })}
            </div>
          ))}
        </div>
        {renderPaperTail()}
      </div>
    );
  }

  if (activeTemplate === "charting") {
    return (
      <div className="mt-6 space-y-3">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          BẢNG HỆ THỐNG ĐỐI CHIẾU (CHARTING METHOD)
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/80 md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/80 font-mono text-[10px] text-[var(--ink-muted)] uppercase">
                <th className="w-[30%] p-3">Tiêu chí / Câu hỏi</th>
                <th className="w-[16%] p-3">Phân loại</th>
                <th className="w-[54%] p-3">Nội dung & Công thức</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {blocks.map((block) => {
                const meta = SEMANTIC_META[block.type];
                return (
                  <tr key={block.id} className="group align-top">
                    <td className="p-3 font-medium">
                      <AutoResizeTextarea
                        value={block.cue}
                        onChange={(e) =>
                          onUpdateBlock(noteId, block.id, {
                            cue: e.target.value,
                          })
                        }
                        className="w-full bg-transparent text-xs leading-relaxed font-semibold outline-none sm:text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <span
                        className="inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap"
                        style={{
                          backgroundColor: meta.bgVar,
                          borderColor: meta.borderVar,
                        }}
                      >
                        {meta.badge}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {renderCard(block, { compact: true, hideBadge: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border-hairline)] overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 md:hidden">
          {blocks.map((block) => {
            const meta = SEMANTIC_META[block.type];
            return (
              <div key={block.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <AutoResizeTextarea
                    value={block.cue}
                    onChange={(e) =>
                      onUpdateBlock(noteId, block.id, { cue: e.target.value })
                    }
                    className="min-w-0 flex-1 bg-transparent text-xs leading-snug font-bold outline-none"
                  />
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold"
                    style={{
                      backgroundColor: meta.bgVar,
                      borderColor: meta.borderVar,
                    }}
                  >
                    {meta.badge}
                  </span>
                </div>
                {renderCard(block, { compact: true, hideBadge: true })}
              </div>
            );
          })}
        </div>
        {renderPaperTail()}
      </div>
    );
  }

  if (activeTemplate === "feynman") {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 px-3.5 py-2.5 text-xs text-[var(--ink-muted)]">
          <strong className="font-mono text-[var(--ink-primary)]">
            NGUYÊN TẮC FEYNMAN:
          </strong>{" "}
          Nếu chưa giải thích được thật đơn giản cho người mới nghe, tức là ta
          còn lỗ hổng. Chạm vào từng bước để tự kiểm tra.
        </div>

        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className="group rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/65 p-4"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] font-mono text-[11px] font-bold text-[var(--accent-primary-fg)]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <AutoResizeTextarea
                value={block.cue}
                onChange={(e) =>
                  onUpdateBlock(noteId, block.id, { cue: e.target.value })
                }
                className="w-full bg-transparent font-sans text-sm font-bold outline-none"
              />
            </div>
            <div className="pl-0 sm:pl-8">{renderCard(block)}</div>
          </div>
        ))}
        {renderPaperTail()}
      </div>
    );
  }

  if (activeTemplate === "split") {
    return (
      <div className="mt-6 space-y-4">
        <div className="hidden grid-cols-2 gap-6 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase lg:grid">
          <div className="border-r border-[var(--border-hairline)] pr-4">
            NỬA TRÁI: BẢN GỐC / ĐỀ BÀI / TỪ VỰNG (50%)
          </div>
          <div>NỬA PHẢI: GIẢI NGHĨA / LỜI GIẢI / GHI CHÚ (50%)</div>
        </div>

        <div className="hidden space-y-4 lg:block">
          {blocks.map((block) => (
            <div key={block.id} className="group grid grid-cols-2 gap-6">
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 p-3.5">
                <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                  Đề bài / Bản gốc
                </span>
                <AutoResizeTextarea
                  value={block.cue}
                  onChange={(e) =>
                    onUpdateBlock(noteId, block.id, { cue: e.target.value })
                  }
                  className="mt-1 w-full bg-transparent text-sm leading-relaxed font-medium outline-none"
                />
              </div>
              <div>{renderCard(block)}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3 lg:hidden">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
            >
              <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/65 p-3">
                <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                  Đề bài / Bản gốc
                </span>
                <AutoResizeTextarea
                  value={block.cue}
                  onChange={(e) =>
                    onUpdateBlock(noteId, block.id, { cue: e.target.value })
                  }
                  className="mt-0.5 w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
              <div className="p-2">{renderCard(block)}</div>
            </div>
          ))}
        </div>
        {renderPaperTail()}
      </div>
    );
  }

  // Todai 3-Column Method
  return (
    <div className="mt-6 space-y-4">
      <div className="hidden grid-cols-12 gap-4 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase lg:grid">
        <div className="col-span-5">01. FACT (KIẾN THỨC GỐC)</div>
        <div className="col-span-4">02. INSIGHT (SUY LUẬN)</div>
        <div className="col-span-3">03. ACTION (ÁP DỤNG)</div>
      </div>

      <div className="hidden space-y-4 lg:block">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="group grid grid-cols-12 items-start gap-4"
          >
            <div className="col-span-5 min-w-0">
              {renderCard(block, { compact: true })}
            </div>
            <div className="col-span-4 min-w-0 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 p-3">
              <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                Suy luận / Câu hỏi
              </span>
              <AutoResizeTextarea
                value={block.cue}
                onChange={(e) =>
                  onUpdateBlock(noteId, block.id, { cue: e.target.value })
                }
                className="mt-1 w-full bg-transparent text-xs leading-relaxed font-medium outline-none sm:text-sm"
              />
            </div>
            <div
              className="col-span-3 min-w-0 rounded-xl border p-3"
              style={{
                backgroundColor: "var(--sem-ex-bg)",
                borderColor: "var(--sem-ex-border)",
              }}
            >
              <span className="font-mono text-[10px] font-bold uppercase">
                Hành động / Bài tập
              </span>
              <AutoResizeTextarea
                value={block.action ?? ""}
                onChange={(e) =>
                  onUpdateBlock(noteId, block.id, { action: e.target.value })
                }
                placeholder="Ghi bài tập áp dụng..."
                className="mt-1 w-full bg-transparent text-xs leading-relaxed outline-none placeholder:text-[var(--ink-muted)]"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3.5 lg:hidden">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="space-y-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 p-3"
          >
            <div>
              <div className="mb-1 font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                01. FACT • KIẾN THỨC GỐC
              </div>
              {renderCard(block, { compact: true })}
            </div>

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2.5">
              <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                02. INSIGHT • SUY LUẬN
              </span>
              <AutoResizeTextarea
                value={block.cue}
                onChange={(e) =>
                  onUpdateBlock(noteId, block.id, { cue: e.target.value })
                }
                className="mt-0.5 w-full bg-transparent text-xs font-medium outline-none"
              />
            </div>

            <div
              className="rounded-xl border p-2.5"
              style={{
                backgroundColor: "var(--sem-ex-bg)",
                borderColor: "var(--sem-ex-border)",
              }}
            >
              <span className="font-mono text-[10px] font-bold uppercase">
                03. ACTION • ÁP DỤNG
              </span>
              <AutoResizeTextarea
                value={block.action ?? ""}
                onChange={(e) =>
                  onUpdateBlock(noteId, block.id, { action: e.target.value })
                }
                placeholder="Ghi bài tập áp dụng..."
                className="mt-0.5 w-full bg-transparent text-xs outline-none placeholder:text-[var(--ink-muted)]"
              />
            </div>
          </div>
        ))}
      </div>
      {renderPaperTail()}
    </div>
  );
}
