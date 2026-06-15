import { useCallback, useReducer } from "react";
import type { Application } from "./types";
import {
  detailWindowsReducer,
  type DetailWindowGeometry,
  type DetailWindowState,
} from "./detailWindowsReducer";

export function useDetailWindows() {
  const [windows, dispatch] = useReducer(detailWindowsReducer, [] as DetailWindowState[]);

  const openWindow = useCallback((application: Application) => {
    dispatch({ type: "OPEN", applicationId: application.id });
  }, []);

  const closeWindow = useCallback((applicationId: string) => {
    dispatch({ type: "CLOSE", applicationId });
  }, []);

  const bringToFront = useCallback((applicationId: string) => {
    dispatch({ type: "FOCUS", applicationId });
  }, []);

  const updateGeometry = useCallback((applicationId: string, geometry: DetailWindowGeometry) => {
    dispatch({ type: "UPDATE_GEOMETRY", applicationId, geometry });
  }, []);

  return { windows, openWindow, closeWindow, bringToFront, updateGeometry };
}
