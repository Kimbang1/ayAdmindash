export interface DetailWindowState {
  applicationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export type DetailWindowGeometry = Partial<Pick<DetailWindowState, "x" | "y" | "width" | "height">>;

export type DetailWindowAction =
  | { type: "OPEN"; applicationId: string }
  | { type: "CLOSE"; applicationId: string }
  | { type: "FOCUS"; applicationId: string }
  | { type: "UPDATE_GEOMETRY"; applicationId: string; geometry: DetailWindowGeometry };

export const DEFAULT_WINDOW_WIDTH = 480;
export const DEFAULT_WINDOW_HEIGHT = 640;
const INITIAL_X = 80;
const INITIAL_Y = 80;
const CASCADE_OFFSET = 32;
const CASCADE_WRAP = 6;

function nextZIndex(windows: DetailWindowState[]): number {
  return windows.reduce((max, w) => Math.max(max, w.zIndex), 0) + 1;
}

export function detailWindowsReducer(
  windows: DetailWindowState[],
  action: DetailWindowAction,
): DetailWindowState[] {
  switch (action.type) {
    case "OPEN": {
      const existing = windows.find((w) => w.applicationId === action.applicationId);
      if (existing) {
        const zIndex = nextZIndex(windows);
        return windows.map((w) =>
          w.applicationId === action.applicationId ? { ...w, zIndex } : w,
        );
      }

      const cascadeIndex = windows.length % CASCADE_WRAP;
      return [
        ...windows,
        {
          applicationId: action.applicationId,
          x: INITIAL_X + cascadeIndex * CASCADE_OFFSET,
          y: INITIAL_Y + cascadeIndex * CASCADE_OFFSET,
          width: DEFAULT_WINDOW_WIDTH,
          height: DEFAULT_WINDOW_HEIGHT,
          zIndex: nextZIndex(windows),
        },
      ];
    }

    case "CLOSE":
      return windows.filter((w) => w.applicationId !== action.applicationId);

    case "FOCUS": {
      const zIndex = nextZIndex(windows);
      return windows.map((w) =>
        w.applicationId === action.applicationId ? { ...w, zIndex } : w,
      );
    }

    case "UPDATE_GEOMETRY":
      return windows.map((w) =>
        w.applicationId === action.applicationId ? { ...w, ...action.geometry } : w,
      );

    default:
      return windows;
  }
}
