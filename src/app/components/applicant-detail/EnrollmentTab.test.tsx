import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EnrollmentTab } from "./EnrollmentTab";
import { buildApplication } from "./testUtils";

vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({ value, onChange, placeholder }: { value: string | null; onChange: (date: string | null) => void; placeholder?: string }) => (
    <button onClick={() => onChange("2026-07-01")}>{value ?? placeholder ?? ""}</button>
  ),
}));

describe("EnrollmentTab", () => {
  it("등록 예정일이 없으면 안내 문구를 보여준다", () => {
    render(<EnrollmentTab application={buildApplication()} onSave={vi.fn()} saving={false} />);

    expect(screen.getByText("지정 안 함")).toBeInTheDocument();
  });

  it("날짜를 선택하면 onSave가 enrollment_date와 함께 호출된다", () => {
    const onSave = vi.fn();
    render(<EnrollmentTab application={buildApplication()} onSave={onSave} saving={false} />);

    fireEvent.click(screen.getByText("지정 안 함"));

    expect(onSave).toHaveBeenCalledWith({ enrollment_date: "2026-07-01" });
  });
});
