import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DateFieldPopover } from "./DateFieldPopover";

describe("DateFieldPopover", () => {
  it("버튼을 클릭하면 달력이 열리고 날짜를 선택하면 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateFieldPopover value={null} onChange={onChange} placeholder="지정 안 함" />);

    await user.click(screen.getByText("지정 안 함"));

    const dayButtons = screen.getAllByRole("gridcell", { name: "15" });
    await user.click(dayButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
