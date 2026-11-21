import type {
  Binder,
  Flashcard,
  Note,
  NoteFont,
  PaperStyle,
  ThemeId,
  UserProfile,
} from "@/types/study";

export interface UserPreferences {
  theme: ThemeId;
  defaultPaper: PaperStyle;
  noteFont: NoteFont;
}

/**
 * Data access contract used by UI components so the current MockLocalAdapter
 * can be replaced cleanly with SupabaseAdapter in Phase 2 without editing UI code.
 */
export interface IStudyRepository {
  getProfile(): Promise<UserProfile>;
  updatePreferences(prefs: Partial<UserPreferences>): Promise<void>;
  listBinders(): Promise<Binder[]>;
  createBinder(input: Omit<Binder, "id" | "sortOrder" | "masteryPercent">): Promise<Binder>;
  updateBinder(id: string, patch: Partial<Binder>): Promise<Binder>;
  listNotes(binderId?: string): Promise<Note[]>;
  getNote(noteId: string): Promise<Note | null>;
  upsertNote(note: Note): Promise<Note>;
  listFlashcards(binderId?: string): Promise<Flashcard[]>;
  recordFlashcardReview(id: string, rating: 1 | 2 | 3 | 4): Promise<Flashcard>;
  logStudySession(binderId: string, minutes: number): Promise<void>;
}

/**
 * Authentication contract designed to map 1:1 to Supabase Auth (Google OAuth + Magic Link).
 */
export interface IAuthAdapter {
  getCurrentUser(): Promise<UserProfile | null>;
  signInWithGoogle(): Promise<void>;
  signInWithMagicLink(email: string): Promise<{ sent: boolean }>;
  signOut(): Promise<void>;
}
