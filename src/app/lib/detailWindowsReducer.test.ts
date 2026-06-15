import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  detailWindowsReducer,
  type DetailWindowState,
} from "./detailWindowsReducer";

describe("detailWindowsReducer", () => {
  it("OPEN으로 새 창을 추가한다", () => {
    const result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      applicationId: "a1",
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      zIndex: 1,
    });
  });

  it("OPEN을 여러 번 호출하면 창이 cascade 오프셋으로 배치된다", () => {
    let result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });
    result = detailWindowsReducer(result, { type: "OPEN", applicationId: "a2" });

    expect(result).toHaveLength(2);
    expect(result[1].x).toBeGreaterThan(result[0].x);
    expect(result[1].y).toBeGreaterThan(result[0].y);
  });

  it("이미 열린 창을 다시 OPEN하면 새 창을 만들지 않고 zIndex만 최상위로 올린다", () => {
    let result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });
    result = detailWindowsReducer(result, { type: "OPEN", applicationId: "a2" });
    const before = result.find((w) => w.applicationId === "a1") as DetailWindowState;

    result = detailWindowsReducer(result, { type: "OPEN", applicationId: "a1" });

    expect(result).toHaveLength(2);
    const after = result.find((w) => w.applicationId === "a1") as DetailWindowState;
    expect(after.zIndex).toBeGreaterThan(before.zIndex);
    expect(after.x).toBe(before.x);
  });

  it("CLOSE로 창을 제거한다", () => {
    let result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });
    result = detailWindowsReducer(result, { type: "OPEN", applicationId: "a2" });

    result = detailWindowsReducer(result, { type: "CLOSE", applicationId: "a1" });

    expect(result).toHaveLength(1);
    expect(result[0].applicationId).toBe("a2");
  });

  it("FOCUS로 해당 창의 zIndex를 최상위로 올린다", () => {
    let result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });
    result = detailWindowsReducer(result, { type: "OPEN", applicationId: "a2" });
    const a1Before = result.find((w) => w.applicationId === "a1") as DetailWindowState;
    const a2Before = result.find((w) => w.applicationId === "a2") as DetailWindowState;
    expect(a2Before.zIndex).toBeGreaterThan(a1Before.zIndex);

    result = detailWindowsReducer(result, { type: "FOCUS", applicationId: "a1" });

    const a1After = result.find((w) => w.applicationId === "a1") as DetailWindowState;
    expect(a1After.zIndex).toBeGreaterThan(a2Before.zIndex);
  });

  it("UPDATE_GEOMETRY로 위치/크기를 갱신한다", () => {
    let result = detailWindowsReducer([], { type: "OPEN", applicationId: "a1" });

    result = detailWindowsReducer(result, {
      type: "UPDATE_GEOMETRY",
      applicationId: "a1",
      geometry: { x: 200, y: 150, width: 600, height: 700 },
    });

    expect(result[0]).toMatchObject({ x: 200, y: 150, width: 600, height: 700 });
  });
});
