import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { create } from "zustand";
import { getApiErrorMessage, getSyncStatus, syncPendingAssessments } from "../services/api";

type SyncStore = {
  pending: number;
  pendingAssessments: number;
  pendingPatients: number;
  pendingMessages: number;
  conflicts: number;
  pendingSyncCount: number;
  isSyncing: boolean;
  isBackendConfigured: boolean;
  isOnline: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
  startMonitoring: () => () => void;
};

let monitoringUsers = 0;
let stopMonitoring: (() => void) | null = null;

export const useSyncStore = create<SyncStore>((set) => ({
  pending: 0,
  pendingAssessments: 0,
  pendingPatients: 0,
  pendingMessages: 0,
  conflicts: 0,
  pendingSyncCount: 0,
  isSyncing: false,
  isBackendConfigured: false,
  isOnline: false,
  syncError: null,

  refresh: async () => {
    set({ isSyncing: false });
    try {
      let status = await getSyncStatus();
      let syncError: string | null = null;
      set({
        isBackendConfigured: status.postgresConfigured,
        isOnline: true,
        isSyncing: status.postgresConfigured,
      });

      if (status.postgresConfigured) {
        try {
          await syncPendingAssessments();
        } catch (error) {
          syncError = getApiErrorMessage(error);
        }
      }

      status = await getSyncStatus();
      set({
        pending: status.pending,
        pendingAssessments: status.pendingAssessments ?? status.pending,
        pendingPatients: status.pendingPatients ?? 0,
        pendingMessages: status.pendingMessages ?? 0,
        conflicts: status.conflicts,
        pendingSyncCount: status.pending + status.conflicts,
        isBackendConfigured: status.postgresConfigured,
        isOnline: true,
        syncError: syncError ?? (status.pending > 0 && !status.postgresConfigured
          ? "Record and message sync is not configured on the backend."
          : status.pending > 0
            ? "Records remain pending. Sync will retry when Neon is available."
            : null),
      });
    } catch (error) {
      set({
        isSyncing: false,
        isOnline: false,
        syncError: `Unable to reach the API to check sync status. ${getApiErrorMessage(error)}`,
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  startMonitoring: () => {
    monitoringUsers += 1;

    if (!stopMonitoring) {
      let isActive = true;
      let refreshInProgress = false;
      const refresh = async () => {
        if (!isActive || refreshInProgress) return;
        refreshInProgress = true;
        try {
          await useSyncStore.getState().refresh();
        } finally {
          refreshInProgress = false;
        }
      };

      void refresh();
      const appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      const networkUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected === true) {
          void refresh();
        } else if (state.isConnected === false) {
          set({ isOnline: false });
        }
      });

      void NetInfo.fetch().then((state) => {
        if (state.isConnected !== false) void refresh();
      });
      const retryInterval = setInterval(() => {
        if (useSyncStore.getState().isOnline) void refresh();
      }, 1_000);

      stopMonitoring = () => {
        isActive = false;
        appStateSubscription.remove();
        networkUnsubscribe();
        clearInterval(retryInterval);
        stopMonitoring = null;
      };
    }

    return () => {
      monitoringUsers -= 1;
      if (monitoringUsers === 0) stopMonitoring?.();
    };
  },
}));
