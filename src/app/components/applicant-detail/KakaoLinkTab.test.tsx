import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KakaoLinkTab } from "./KakaoLinkTab";
import { buildApplication } from "./testUtils";

describe("KakaoLinkTab", () => {
  it("링크가 없으면 상담 연결 버튼이 비활성화되고 저장 버튼도 비활성화된다", () => {
    render(<KakaoLinkTab application={buildApplication()} onSave={vi.fn()} saving={false} />);

    expect(screen.getByRole("button", { name: "상담 연결" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });

  it("링크를 입력하면 저장 버튼이 활성화되고 onSave가 호출된다", () => {
    const onSave = vi.fn();
    render(<KakaoLinkTab application={buildApplication()} onSave={onSave} saving={false} />);

    const input = screen.getByPlaceholderText("https://open.kakao.com/...");
    fireEvent.change(input, { target: { value: "https://open.kakao.com/test" } });

    const saveButton = screen.getByRole("button", { name: "저장" });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({ kakao_link: "https://open.kakao.com/test" });
  });

  it("기존 링크가 있으면 상담 연결 버튼이 활성화된다", () => {
    render(
      <KakaoLinkTab
        application={buildApplication({ kakao_link: "https://open.kakao.com/existing" })}
        onSave={vi.fn()}
        saving={false}
      />,
    );

    const link = screen.getByRole("link", { name: "상담 연결" });
    expect(link).toHaveAttribute("href", "https://open.kakao.com/existing");
  });
});
