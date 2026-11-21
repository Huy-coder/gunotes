import type { StickerId, UserProfile } from "@/types/study";

export const DEFAULT_STARTER_STICKERS: StickerId[] = ["coffee", "sparkle"];

export function createEmptyUserProfile(
  overrides?: Partial<UserProfile>
): UserProfile {
  return {
    id: "local-user",
    displayName: "Bạn mới",
    email: "",
    streakDays: 0,
    weeklyFocusMinutes: 0,
    todayFocusMinutes: 0,
    unlockedStickers: [...DEFAULT_STARTER_STICKERS],
    studyPersona: "flow",
    onboarded: false,
    ...overrides,
  };
}
