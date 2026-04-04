import { useCallback, useEffect, useRef } from "react";

/**
 * Browsers can throttle timers/background tasks while a tab is hidden or minimized.
 * This hook centralizes app "resume" detection and runs a debounced reconciliation callback.
 */
export function useAppResumeSync(onResume, { debounceMs = 1000, enabled = true } = {}) {
  const callbackRef = useRef(onResume);
  const timeoutRef = useRef(null);
  const lastRunRef = useRef(0);

  useEffect(() => {
    callbackRef.current = onResume;
  }, [onResume]);

  const scheduleResumeSync = useCallback(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const now = Date.now();

      // Guard rapid duplicate events (visibility + focus + pageshow can fire together).
      if (now - lastRunRef.current < debounceMs) return;

      lastRunRef.current = now;
      callbackRef.current?.();
    }, debounceMs);
  }, [debounceMs, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleResumeSync();
      }
    };

    const handleFocus = () => scheduleResumeSync();
    const handlePageShow = () => scheduleResumeSync();
    const handleOnline = () => scheduleResumeSync();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, scheduleResumeSync]);
}

export default useAppResumeSync;
