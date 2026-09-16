import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { create } from "zustand";
import { getSyncStatus, syncPendingAssessments } from "../services/api";

type SyncStore = {
  pending: number;
  pendingAssessments: number;
  pendingPatients: number;
  conflicts: number;
  pendingSyncCount: number;
  isSyncing: boolean;
  isBackendConfigured: boolean;
  isOnline: boolean;
  refresh: () => Promise<void>;
  startMonitoring: () => () => void;
};

let monitoringUsers = 0;
let stopMonitoring: (() => void) | null = null;

export const useSyncStore = create<SyncStore>((set) => ({
  pending: 0,
  pendingAssessments: 0,
  pendingPatients: 0,
  conflicts: 0,
  pendingSyncCount: 0,
  isSyncing: false,
  isBackendConfigured: false,
  isOnline: false,

  refresh: async () => {
    set({ isSyncing: false });
    try {
      const beforeSync = await getSyncStatus();
      set({
        pending: beforeSync.pending,
        pendingAssessments: beforeSync.pendingAssessments ?? beforeSync.pending,
        pendingPatients: beforeSync.pendingPatients ?? 0,
        conflicts: beforeSync.conflicts,
        pendingSyncCount: beforeSync.pending + beforeSync.conflicts,
        isBackendConfigured: true,
        isOnline: true,
      });

      if (beforeSync.postgresConfigured) {
        set({ isSyncing: true });
        try {
          await syncPendingAssessments();
          const afterSync = await getSyncStatus();
          set({
            pending: afterSync.pending,
            pendingAssessments: afterSync.pendingAssessments ?? afterSync.pending,
            pendingPatients: afterSync.pendingPatients ?? 0,
            conflicts: afterSync.conflicts,
            pendingSyncCount: afterSync.pending + afterSync.conflicts,
            isBackendConfigured: true,
            isOnline: true,
          });
        } finally {
          set({ isSyncing: false });
        }
      }
    } catch {
      set({ isSyncing: false, isBackendConfigured: false, isOnline: false });
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
        void refresh();
      }, 5_000);

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
