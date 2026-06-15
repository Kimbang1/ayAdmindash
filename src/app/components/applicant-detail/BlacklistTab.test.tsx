import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlacklistTab } from "./BlacklistTab";
import { buildApplication } from "./testUtils";

describe("BlacklistTab", () => {
  it("변경 사항이 없으면 저장 버튼이 비활성화된다", () => {
    render(<BlacklistTab application={buildApplication()} onSave={vi.fn()} saving={false} />);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("스위치를 켜고 사유를 입력한 뒤 저장하면 onSave가 호출된다", () => {
    const onSave = vi.fn();
    render(<BlacklistTab application={buildApplication()} onSave={onSave} saving={false} />);

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.change(screen.getByPlaceholderText("블랙리스트 사유를 입력하세요"), {
      target: { value: "악성 민원" },
    });

    const saveButton = screen.getByRole("button", { name: "저장" });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({ is_blacklisted: true, blacklist_reason: "악성 민원" });
  });
});
