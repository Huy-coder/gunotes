"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import { StickerArt } from "@/components/stickers/StickerArt";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type EmailTab = "password" | "magic-link";
type PasswordMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const loginMock = useAppStore((s) => s.loginMock);
  const hydrateFromSupabase = useAppStore((s) => s.hydrateFromSupabase);
  const showToast = useAppStore((s) => s.showToast);

  const [emailTab, setEmailTab] = useState<EmailTab>("password");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [signupNeedsConfirm, setSignupNeedsConfirm] = useState(false);
  const [restoringSession, setRestoringSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      setErrorMsg(
        "Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại."
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!active || !u) return;
      setRestoringSession(true);
      if (useAppStore.getState().cloudUserId !== u.id) {
        const meta = u.user_metadata as Record<string, unknown> | undefined;
        const fullName =
          typeof meta?.full_name === "string"
            ? meta.full_name
            : typeof meta?.name === "string"
            ? meta.name
            : undefined;
        void hydrateFromSupabase(u.id, u.email ?? "", fullName);
      }
      router.replace("/workspace");
    });
    return () => {
      active = false;
    };
  }, [hydrateFromSupabase, router]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      loginMock("guest");
      showToast("Đã bắt đầu không gian học tập cục bộ!");
      router.push(useAppStore.getState().user.onboarded ? "/workspace" : "/onboarding");
      return;
    }

    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/workspace`,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("provider is not enabled")) {
          setErrorMsg(
            "Google OAuth chưa được bật trên Supabase Dashboard (Authentication → Providers → Google). Bạn có thể đăng ký/đăng nhập bằng Email & Mật khẩu ngay bên dưới!"
          );
        } else {
          setErrorMsg(error.message);
        }
        setGoogleBusy(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không thể kết nối Google OAuth."
      );
      setGoogleBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || password.length < 6) {
      setErrorMsg("Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      loginMock("magic-link", email.trim());
      router.push("/workspace");
      return;
    }

    setBusy(true);
    try {
      if (passwordMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: displayName.trim() || email.trim().split("@")[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          setBusy(false);
          return;
        }
        if (data.session && data.user) {
          await hydrateFromSupabase(
            data.user.id,
            data.user.email ?? email.trim(),
            displayName.trim() || undefined
          );
          showToast("Tạo tài khoản Supabase & đồng bộ thành công!");
          router.push("/onboarding");
          return;
        }
        setSignupNeedsConfirm(true);
        showToast("Đã gửi email xác nhận tài khoản!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(
            error.message.includes("Invalid login credentials")
              ? "Email hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy chuyển sang tab Tạo tài khoản mới."
              : error.message
          );
          setBusy(false);
          return;
        }
        if (data.user) {
          await hydrateFromSupabase(
            data.user.id,
            data.user.email ?? email.trim()
          );
          showToast("Đăng nhập Supabase Cloud thành công!");
          router.push("/workspace");
          return;
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi xác thực."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMagicSent(true);
      loginMock("magic-link", email.trim());
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/workspace`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setMagicSent(true);
        showToast(`Đã gửi Magic Link tới ${email.trim()}`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không gửi được Magic Link."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="desk-dot flex min-h-screen flex-col items-center justify-center px-4 py-10 text-[var(--ink-primary)]">
      {/* Top Mobile Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink-primary)]" />
          <span>GuNotes.</span>
        </Link>
        <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
          Không gian học bá có gu • Supabase Cloud
        </p>
      </div>

      {/* Main Split Paper Card */}
      <div className="paper-shadow grid w-full max-w-[920px] grid-cols-1 overflow-hidden rounded-[20px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] lg:grid-cols-12">
        {/* Left Visual Panel (Desktop) */}
        <div className="paper-dot relative hidden flex-col justify-between border-r border-[var(--border-hairline)] p-8 pl-12 lg:col-span-5 lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-3 flex flex-col justify-evenly"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)]"
              />
            ))}
          </div>

          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink-primary)]" />
            <span>GuNotes.</span>
          </Link>

          <div className="relative my-8 space-y-3">
            <div
              className="relative rounded-2xl border p-4 pl-6 transition hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--binder-blue-bg)",
                borderColor: "var(--binder-blue-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                  #toan-cao-cap
                </span>
                <StickerArt id="sparkle" size={28} />
              </div>
              <div className="mt-1 font-bold">Giải tích 1</div>
              <div className="font-mono text-[11px] text-[var(--ink-muted)]">
                Sơ đồ nhánh đa tầng • Visualize
              </div>
            </div>

            <div
              className="relative ml-5 rounded-2xl border p-4 pl-6"
              style={{
                backgroundColor: "var(--binder-sage-bg)",
                borderColor: "var(--binder-sage-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                  SUPABASE CLOUD
                </span>
                <StickerArt id="coffee" size={28} />
              </div>
              <div className="mt-1 font-bold">Đồng bộ an toàn</div>
              <div className="font-mono text-[11px] text-[var(--ink-muted)]">
                Row-Level Security • Cross-device
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            &ldquo;Ghi chép thông minh là khởi đầu của tư duy mạch lạc.&rdquo;
          </p>
        </div>

        {/* Right Auth Form Panel */}
        <div className="flex flex-col justify-center bg-[var(--bg-elevated)] p-6 sm:p-10 lg:col-span-7">
          <div className="mx-auto w-full max-w-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-muted)]">
              <Sparkles className="h-3 w-3" />
              <span>Supabase Cloud Sync</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              Mở bàn học của bạn
            </h1>
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              Đăng nhập để lưu trữ và đồng bộ toàn bộ sổ tay, sơ đồ nhánh và
              lịch ôn tập trên Supabase.
            </p>

            {restoringSession && (
              <div
                className="mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium"
                style={{
                  backgroundColor: "var(--sem-def-bg)",
                  borderColor: "var(--sem-def-border)",
                }}
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>Đang khôi phục phiên đăng nhập...</span>
              </div>
            )}

            {errorMsg && (
              <div
                className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed"
                style={{
                  backgroundColor: "var(--sem-trap-bg)",
                  borderColor: "var(--sem-trap-border)",
                }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <button
                type="button"
                disabled={googleBusy || busy}
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 text-sm font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] disabled:opacity-60"
              >
                {googleBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                )}
                <span>Tiếp tục với Google</span>
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-[var(--border-hairline)]" />
                <span className="mx-3 shrink-0 font-mono text-[10px] tracking-wider text-[var(--ink-muted)] uppercase">
                  HOẶC DÙNG EMAIL
                </span>
                <div className="flex-grow border-t border-[var(--border-hairline)]" />
              </div>

              {/* Switch between Password vs Magic Link */}
              <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmailTab("password");
                    setErrorMsg(null);
                  }}
                  className={`rounded-full py-1.5 text-xs font-semibold transition ${
                    emailTab === "password"
                      ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  Email & Mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailTab("magic-link");
                    setErrorMsg(null);
                  }}
                  className={`rounded-full py-1.5 text-xs font-semibold transition ${
                    emailTab === "magic-link"
                      ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {emailTab === "password" ? (
                signupNeedsConfirm ? (
                  <div
                    className="space-y-3 rounded-2xl border p-4 text-sm"
                    style={{
                      backgroundColor: "var(--sem-ex-bg)",
                      borderColor: "var(--sem-ex-border)",
                    }}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Kiểm tra hộp thư của bạn</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
                      Mình đã gửi liên kết xác nhận tới{" "}
                      <strong>{email}</strong>. Bấm vào link trong email để
                      kích hoạt và tự động mở bàn học của bạn.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSignupNeedsConfirm(false);
                        setPasswordMode("signin");
                      }}
                      className="text-xs font-semibold underline underline-offset-4"
                    >
                      Quay lại đăng nhập
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-3">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[var(--ink-muted)]">
                        {passwordMode === "signin"
                          ? "ĐĂNG NHẬP TÀI KHOẢN"
                          : "TẠO TÀI KHOẢN MỚI"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordMode((m) =>
                            m === "signin" ? "signup" : "signin"
                          );
                          setErrorMsg(null);
                        }}
                        className="font-semibold text-[var(--ink-primary)] underline underline-offset-4"
                      >
                        {passwordMode === "signin"
                          ? "Chưa có? Đăng ký"
                          : "Đã có? Đăng nhập"}
                      </button>
                    </div>

                    {passwordMode === "signup" && (
                      <div>
                        <label
                          htmlFor="display-name-input"
                          className="mb-1 block font-mono text-[10px] text-[var(--ink-muted)]"
                        >
                          TÊN HIỂN THỊ
                        </label>
                        <input
                          id="display-name-input"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="VD: Hoàng Nam"
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2 text-sm outline-none transition focus:border-[var(--ink-primary)]"
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="email-pw-input"
                        className="mb-1 block font-mono text-[10px] text-[var(--ink-muted)]"
                      >
                        EMAIL HỌC TẬP
                      </label>
                      <input
                        id="email-pw-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ban@truonghoc.edu.vn"
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2 text-sm outline-none transition focus:border-[var(--ink-primary)]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password-input"
                        className="mb-1 block font-mono text-[10px] text-[var(--ink-muted)]"
                      >
                        MẬT KHẨU (TỐI THIỂU 6 KÝ TỰ)
                      </label>
                      <input
                        id="password-input"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2 text-sm outline-none transition focus:border-[var(--ink-primary)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      <span>
                        {passwordMode === "signin"
                          ? "Đăng nhập & Đồng bộ"
                          : "Tạo tài khoản GuNotes"}
                      </span>
                    </button>
                  </form>
                )
              ) : !magicSent ? (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div>
                    <label
                      htmlFor="email-input"
                      className="mb-1.5 block font-mono text-[11px] text-[var(--ink-muted)]"
                    >
                      Email học tập của bạn
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@truonghoc.edu.vn"
                      className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--ink-primary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    <span>Gửi liên kết đăng nhập (Magic Link)</span>
                  </button>
                  <p className="text-center text-xs text-[var(--ink-muted)]">
                    Không cần nhớ mật khẩu. Liên kết đăng nhập gửi qua Supabase
                    Auth tới hộp thư của bạn.
                  </p>
                </form>
              ) : (
                <div
                  className="space-y-3 rounded-2xl border p-4 text-sm"
                  style={{
                    backgroundColor: "var(--sem-ex-bg)",
                    borderColor: "var(--sem-ex-border)",
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Đã gửi Magic Link tới {email}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
                    Hãy mở hộp thư và bấm nút xác nhận để đăng nhập thẳng vào
                    bàn học đồng bộ Supabase của bạn.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicSent(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
                  >
                    <span>Gửi lại tới email khác</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-[var(--border-hairline)] pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  loginMock("guest");
                  const onboarded = useAppStore.getState().user.onboarded;
                  router.push(onboarded ? "/workspace" : "/onboarding");
                }}
                className="text-xs font-medium text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink-primary)] hover:underline"
              >
                Tiếp tục không cần tài khoản (Lưu cục bộ) →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
