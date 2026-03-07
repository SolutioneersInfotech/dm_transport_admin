import { useCallback } from "react";
import useAppResumeSync from "../hooks/useAppResumeSync";
import { useAppDispatch } from "../store/hooks";
import { fetchUsers } from "../store/slices/usersSlice";
import { fetchMaintenanceUsers } from "../store/slices/maintenanceUsersSlice";
import { forceRealtimeReconnect } from "../services/firebaseResume";

export default function GlobalResumeReconcile() {
  const dispatch = useAppDispatch();

  const handleResume = useCallback(() => {
    // Centralized resume reconciliation avoids per-page duplicate listeners and keeps shared lists current.
    dispatch(fetchUsers({ page: 1, limit: -1 }));
    dispatch(fetchMaintenanceUsers({ limit: -1 }));
    forceRealtimeReconnect();
  }, [dispatch]);

  useAppResumeSync(handleResume);

  return null;
}
