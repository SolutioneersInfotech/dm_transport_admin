import { useCallback } from "react";
import useAppResumeSync from "../hooks/useAppResumeSync";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers } from "../store/slices/usersSlice";
import { fetchMaintenanceUsers } from "../store/slices/maintenanceUsersSlice";
import { forceRealtimeReconnect } from "../services/firebaseResume";

export default function GlobalResumeReconcile() {
  const dispatch = useAppDispatch();
  const usersLimit = useAppSelector((state) => state.users.limit);
  const maintenanceHasLoaded = useAppSelector((state) => state.maintenanceUsers.hasLoaded);

  const handleResume = useCallback(() => {
    // Single global owner for resume refresh.
    const safeUsersLimit =
      typeof usersLimit === "number" && usersLimit > 0 ? usersLimit : 25;
    dispatch(fetchUsers({ page: 1, limit: safeUsersLimit }));

    // Maintenance chat currently relies on full list semantics.
    if (maintenanceHasLoaded) {
      dispatch(fetchMaintenanceUsers({ limit: -1 }));
    }
    forceRealtimeReconnect();
  }, [dispatch, usersLimit, maintenanceHasLoaded]);

  useAppResumeSync(handleResume);

  return null;
}
