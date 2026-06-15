import type { Application } from "../../lib/types";

export function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    created_at: "2026-06-01T00:00:00.000Z",
    course_id: 1,
    name: "테스트신청자",
    birth_date: "1990-01-01",
    gender: "남",
    phone: "010-0000-0000",
    address: "서울특별시",
    military: null,
    has_training_card: false,
    national_employment: false,
    employment_hours: "15시간미만",
    motivation: null,
    status: "접수",
    enrollment_status: "미등록",
    registered_at: null,
    registered_price: null,
    memo: null,
    kakao_link: null,
    scheduled_date: null,
    is_blacklisted: false,
    blacklist_reason: null,
    enrollment_date: null,
    courses: { name: "컴퓨터 활용" },
    ...overrides,
  };
}
