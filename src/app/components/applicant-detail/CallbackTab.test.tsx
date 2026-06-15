import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CallbackTab } from "./CallbackTab";
import { buildApplication } from "./testUtils";
import * as api from "../../lib/api";

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ token: "test-token", login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({ value }: { value: string | null }) => <span>{value ?? "date"}</span>,
}));

vi.mock("../../lib/api", () => ({
  getCallbacks: vi.fn(),
  addCallback: vi.fn(),
}));

const mockedApi = api as unknown as {
  getCallbacks: ReturnType<typeof vi.fn>;
  addCallback: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.getCallbacks.mockResolvedValue({ logs: [] });
});

describe("CallbackTab", () => {
  it("이력이 없으면 안내 문구를 보여준다", async () => {
    render(<CallbackTab application={buildApplication()} />);

    expect(await screen.findByText("재전화문의 이력이 없습니다.")).toBeInTheDocument();
  });

  it("내용을 입력하고 등록하면 addCallback이 호출되고 입력란이 초기화된다", async () => {
    mockedApi.addCallback.mockResolvedValue({ log: {} });
    render(<CallbackTab application={buildApplication()} />);

    await screen.findByText("재전화문의 이력이 없습니다.");

    const textarea = screen.getByPlaceholderText("재전화문의 내용을 입력하세요");
    fireEvent.change(textarea, { target: { value: "재전화 요청" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(mockedApi.addCallback).toHaveBeenCalled());
    const [token, applicationId, callbackDate, memo] = mockedApi.addCallback.mock.calls[0];
    expect(token).toBe("test-token");
    expect(applicationId).toBe("app-1");
    expect(callbackDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(memo).toBe("재전화 요청");

    await waitFor(() => expect(textarea).toHaveValue(""));
  });
});
