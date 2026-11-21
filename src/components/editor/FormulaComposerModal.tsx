"use client";

import React, { useMemo, useRef, useState } from "react";
import katex from "katex";
import { Check, Sigma, X } from "lucide-react";

type KeypadTab = "calc" | "physics" | "chem";

interface MathKey {
  label: string;
  latex: string;
  cursorOffset?: number;
}

const KEYPAD_TABS: Record<KeypadTab, { name: string; keys: MathKey[] }> = {
  calc: {
    name: "Giải tích & Cơ bản",
    keys: [
      { label: "a/b", latex: "\\frac{}{}", cursorOffset: -3 },
      { label: "xⁿ", latex: "^{}", cursorOffset: -1 },
      { label: "xₙ", latex: "_{}", cursorOffset: -1 },
      { label: "√□", latex: "\\sqrt{}", cursorOffset: -1 },
      { label: "lim", latex: "\\lim_{x \\to 0} " },
      { label: "d/dx", latex: "\\frac{d}{dx} " },
      { label: "∫", latex: "\\int_{a}^{b}  \\,dx", cursorOffset: -5 },
      { label: "∑", latex: "\\sum_{i=1}^{n} " },
      { label: "∞", latex: "\\infty" },
      { label: "→", latex: "\\to " },
      { label: "±", latex: "\\pm " },
      { label: "≠", latex: "\\neq " },
      { label: "≤", latex: "\\leq " },
      { label: "≥", latex: "\\geq " },
      { label: "≈", latex: "\\approx " },
      { label: "( )", latex: "\\left(  \\right)", cursorOffset: -8 },
    ],
  },
  physics: {
    name: "Vật lý & Hy Lạp",
    keys: [
      { label: "Δ", latex: "\\Delta " },
      { label: "α", latex: "\\alpha " },
      { label: "β", latex: "\\beta " },
      { label: "θ", latex: "\\theta " },
      { label: "λ", latex: "\\lambda " },
      { label: "ω", latex: "\\omega " },
      { label: "Ω", latex: "\\Omega " },
      { label: "μ", latex: "\\mu " },
      { label: "π", latex: "\\pi " },
      { label: "ρ", latex: "\\rho " },
      { label: "F⃗", latex: "\\vec{F}" },
      { label: "v = Δs/Δt", latex: "v = \\frac{\\Delta s}{\\Delta t}" },
    ],
  },
  chem: {
    name: "Hóa học & Hệ",
    keys: [
      { label: "t° →", latex: "\\xrightarrow{t^\\circ} " },
      { label: "⇌", latex: "\\rightleftharpoons " },
      { label: "↑", latex: "\\uparrow " },
      { label: "↓", latex: "\\downarrow " },
      { label: "H₂SO₄", latex: "\\text{H}_2\\text{SO}_4" },
      { label: "Fe³⁺", latex: "\\text{Fe}^{3+}" },
      { label: "pH", latex: "\\text{pH} = -\\log[\\text{H}^+]" },
      {
        label: "Hệ PT",
        latex: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}",
      },
    ],
  },
};

export function FormulaComposerModal({
  open,
  initialLatex = "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
  modeLabel = "Chèn khối Công thức",
  onClose,
  onInsert,
}: {
  open: boolean;
  initialLatex?: string;
  modeLabel?: string;
  onClose: () => void;
  onInsert: (latex: string, asDisplayBlock: boolean) => void;
}) {
  const [latex, setLatex] = useState(initialLatex);
  const [activeTab, setActiveTab] = useState<KeypadTab>("calc");
  const [asDisplayBlock, setAsDisplayBlock] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(latex.trim() || "\\square", {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return latex;
    }
  }, [latex]);

  if (!open) return null;

  const insertSnippet = (snippet: string, cursorOffset = 0) => {
    const el = inputRef.current;
    if (!el) {
      setLatex((prev) => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? latex.length;
    const end = el.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + snippet + latex.slice(end);
    setLatex(next);

    const targetPos = start + snippet.length + cursorOffset;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(targetPos, targetPos);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-[1px] sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-shadow flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-[var(--sem-formula-border)]" />
            <h2 className="text-sm font-bold">{modeLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Live KaTeX Preview Surface */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
              <span>XEM TRƯỚC TRỰC TIẾP (KATEX)</span>
              <span>Chạm phím bên dưới để ghép</span>
            </div>
            <div
              className="paper-dot flex min-h-[78px] items-center justify-center overflow-x-auto rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "var(--sem-formula-bg)",
                borderColor: "var(--sem-formula-border)",
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          {/* LaTeX Raw Input */}
          <div>
            <textarea
              ref={inputRef}
              rows={2}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Gõ hoặc bấm các nút công thức bên dưới..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 font-mono text-xs leading-relaxed outline-none focus:border-[var(--ink-primary)]"
            />
          </div>

          {/* 3-Tab Touch Math Keypad */}
          <div>
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {(Object.keys(KEYPAD_TABS) as KeypadTab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    activeTab === tabKey
                      ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                      : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)]"
                  }`}
                >
                  {KEYPAD_TABS[tabKey].name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {KEYPAD_TABS[activeTab].keys.map((k) => (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => insertSnippet(k.latex, k.cursorOffset ?? 0)}
                  className="flex h-10 items-center justify-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 font-mono text-xs font-semibold transition hover:border-[var(--ink-primary)] active:scale-95"
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Choice */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--ink-muted)]">
              Kiểu hiển thị công thức
            </span>
            <div className="flex gap-1 rounded-full bg-[var(--bg-desk)] p-0.5">
              <button
                type="button"
                onClick={() => setAsDisplayBlock(true)}
                className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ${
                  asDisplayBlock
                    ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                Khối riêng ($$)
              </button>
              <button
                type="button"
                onClick={() => setAsDisplayBlock(false)}
                className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ${
                  !asDisplayBlock
                    ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                Trong dòng ($)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setLatex("")}
            className="rounded-full border border-[var(--border-hairline)] px-3.5 py-2 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
          >
            Xóa trắng
          </button>
          <button
            type="button"
            onClick={() => {
              if (!latex.trim()) return;
              onInsert(latex.trim(), asDisplayBlock);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Chèn vào bài ghi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
