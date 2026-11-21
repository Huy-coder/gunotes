"use client";

import {
  isUuid,
  syncProfileToCloud,
  upsertBinderToCloud,
  upsertNoteToCloud,
  type CloudProfilePatch,
  type CloudSyncResult,
} from "@/lib/repository/supabase-sync";
import type { AppState, CloudSyncHelpers, StoreGet, StoreSet } from "@/store/types";

export function canCloudSync(
  s: AppState
): s is AppState & { cloudUserId: string } {
  return (
    s.authMode === "supabase" &&
    Boolean(s.cloudUserId) &&
    isUuid(s.cloudUserId)
  );
}

export function createCloudHelpers(
  set: StoreSet,
  get: StoreGet
): CloudSyncHelpers {
  const applyCloudResult = (res: CloudSyncResult) => {
    if (res.status === "ok") {
      set({ cloudSyncStatus: "synced", cloudError: null });
    } else if (res.status === "schema-missing") {
      set({
        cloudSyncStatus: "schema-missing",
        cloudError:
          "Chưa chạy SQL Schema tạo bảng trên Supabase. Vào Cài đặt → Dữ liệu để copy SQL.",
      });
    } else {
      set({
        cloudSyncStatus: "error",
        cloudError: res.message ?? "Lỗi đồng bộ Supabase",
      });
    }
  };

  const pushProfilePatch = (patch: CloudProfilePatch) => {
    const s = get();
    if (!canCloudSync(s)) return;
    set({ cloudSyncStatus: "syncing" });
    syncProfileToCloud(s.cloudUserId, patch, applyCloudResult);
  };

  const pushNoteDebounced = (noteId: string) => {
    const s = get();
    if (!canCloudSync(s)) return;
    const note = s.notes.find((n) => n.id === noteId);
    if (!note) return;
    set({ cloudSyncStatus: "syncing" });
    upsertNoteToCloud(s.cloudUserId, note, applyCloudResult);
  };

  const pushBinderImmediate = (binderId: string) => {
    const s = get();
    if (!canCloudSync(s)) return;
    const binder = s.binders.find((b) => b.id === binderId);
    if (!binder) return;
    set({ cloudSyncStatus: "syncing" });
    void upsertBinderToCloud(s.cloudUserId, binder).then(applyCloudResult);
  };

  return {
    applyCloudResult,
    pushProfilePatch,
    pushNoteDebounced,
    pushBinderImmediate,
  };
}
