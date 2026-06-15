import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsultationTab } from "./ConsultationTab";
import { buildApplication } from "./testUtils";
import * as api from "../../lib/api";

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ token: "test-token", login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string | null;
    onChange: (date: string | null) => void;
    placeholder?: string;
  }) => <button onClick={() => onChange("2026-07-10")}>{value ?? placeholder ?? "date"}</button>,
}));

vi.mock("../../lib/api", () => ({
  getConsultations: vi.fn(),
  addConsultation: vi.fn(),
  updateConsultationDate: vi.fn(),
}));

const mockedApi = api as unknown as {
  getConsultations: ReturnType<typeof vi.fn>;
  addConsultation: ReturnType<typeof vi.fn>;
  updateConsultationDate: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.getConsultations.mockResolvedValue({ logs: [] });
});

describe("ConsultationTab", () => {
  it("상담 예정일을 선택하면 onSave가 scheduled_date와 함께 호출된다", async () => {
    const onSave = vi.fn();
    render(<ConsultationTab application={buildApplication()} onSave={onSave} saving={false} />);

    const dateButton = await screen.findByText("상담 예정일을 선택하세요");
    fireEvent.click(dateButton);

    expect(onSave).toHaveBeenCalledWith({ scheduled_date: "2026-07-10" });
  });

  it("상담 내용을 입력하고 등록하면 addConsultation이 호출되고 입력란이 초기화된다", async () => {
    mockedApi.addConsultation.mockResolvedValue({ log: {} });
    render(<ConsultationTab application={buildApplication()} onSave={vi.fn()} saving={false} />);

    await screen.findByText("상담 예정일을 선택하세요");

    const textarea = screen.getByPlaceholderText("상담 내용을 입력하세요");
    fireEvent.change(textarea, { target: { value: "초기 상담 진행" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(mockedApi.addConsultation).toHaveBeenCalled());
    const [token, applicationId, content, consultationDate] = mockedApi.addConsultation.mock.calls[0];
    expect(token).toBe("test-token");
    expect(applicationId).toBe("app-1");
    expect(content).toBe("초기 상담 진행");
    expect(consultationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await waitFor(() => expect(textarea).toHaveValue(""));
  });
});
