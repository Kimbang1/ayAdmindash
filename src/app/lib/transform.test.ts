import { describe, expect, it } from "vitest";
import { toApplicants, toCourses } from "./transform";
import type { Application, CourseConfig } from "./types";

const courses: CourseConfig[] = [
  { id: 1, slug: "computer", name: "컴퓨터 활용", duration: "3개월", capacity: 2, price: 100000 },
  { id: 2, slug: "figma", name: "Figma UI/UX", duration: "3개월", capacity: 10, price: 200000 },
];

function application(
  id: string,
  courseId: number,
  phone: string,
  enrollmentStatus: Application["enrollment_status"] = "미등록"
): Application {
  return {
    id,
    created_at: new Date().toISOString(),
    course_id: courseId,
    name: `신청자 ${id}`,
    birth_date: "1990-01-01",
    gender: "남",
    phone,
    address: "서울",
    military: null,
    has_training_card: false,
    national_employment: false,
    employment_hours: "15시간미만",
    motivation: null,
    status: "접수",
    enrollment_status: enrollmentStatus,
    registered_at: enrollmentStatus === "등록" ? new Date().toISOString() : null,
    registered_price: enrollmentStatus === "등록" ? 100000 : null,
    memo: null,
    kakao_link: null,
    scheduled_date: null,
    is_blacklisted: false,
    blacklist_reason: null,
    enrollment_date: null,
    courses: { name: courses.find((course) => course.id === courseId)?.name ?? "" },
  };
}

describe("toCourses", () => {
  it("API 강좌 설정의 정원과 금액을 사용한다", () => {
    const result = toCourses(
      [application("a1", 1, "010-0000-0001"), application("a2", 1, "010-0000-0002")],
      courses
    );

    expect(result[0]).toMatchObject({
      applicants: 2,
      maxCapacity: 2,
      price: 100000,
      status: "마감",
    });
  });
});

describe("toApplicants", () => {
  it("상담 상태와 등록 상태를 변환하지 않고 유지한다", () => {
    const source = application("a1", 1, "010-0000-0001", "등록");
    source.status = "상담완료";

    expect(toApplicants([source])[0]).toMatchObject({
      consultationStatus: "상담완료",
      enrollmentStatus: "등록",
    });
  });

  it("동일 전화번호가 서로 다른 강좌에 등록되면 추가수강으로 표시한다", () => {
    const all = [
      application("a1", 1, "010-1111-2222", "등록"),
      application("a2", 2, "010-1111-2222", "등록"),
    ];

    expect(toApplicants(all, all).every((item) => item.isAdditionalCourse)).toBe(true);
  });

  it("같은 전화번호라도 등록 강좌가 하나면 추가수강으로 표시하지 않는다", () => {
    const all = [
      application("a1", 1, "010-1111-2222", "등록"),
      application("a2", 2, "010-1111-2222", "미등록"),
    ];

    expect(toApplicants(all, all).every((item) => !item.isAdditionalCourse)).toBe(true);
  });
});
