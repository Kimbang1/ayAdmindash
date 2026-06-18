import { describe, expect, it } from "vitest";
import {
  buildCourseMetricBreakdown,
  calculateCurrentCourseRevenue,
  toApplicants,
  toCourses,
} from "./transform";
import type { Application, CourseConfig } from "./types";

const courses: CourseConfig[] = [
  {
    id: 1, slug: "computer", name: "컴퓨터 활용",
    recruitment_start: "2026-06-01", recruitment_end: "2026-06-30",
    training_start: "2026-07-01", training_end: "2026-09-30",
    capacity: 2, price: 100000, instructor: "홍길동", location: "서울", is_active: true,
  },
  {
    id: 2, slug: "figma", name: "Figma UI/UX",
    recruitment_start: "2026-06-01", recruitment_end: "2026-06-30",
    training_start: "2026-07-01", training_end: "2026-09-30",
    capacity: 10, price: 200000, instructor: null, location: null, is_active: false,
  },
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

  it("newApplicationIds에 포함된 신청만 newApplicants로 계산한다", () => {
    const result = toCourses(
      [application("a1", 1, "010-0000-0001"), application("a2", 1, "010-0000-0002")],
      courses,
      new Set(["a1"])
    );

    expect(result[0]).toMatchObject({ applicants: 2, newApplicants: 1 });
  });

  it("newApplicationIds를 생략하면 newApplicants는 0이다", () => {
    const result = toCourses([application("a1", 1, "010-0000-0001")], courses);

    expect(result[0]).toMatchObject({ newApplicants: 0 });
  });

  it("is_active가 false인 강좌는 결과에 포함하지 않는다", () => {
    const result = toCourses([], courses)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("trainingPeriod를 YYYY.MM.DD ~ YYYY.MM.DD 형식으로 반환한다", () => {
    const result = toCourses([], courses)
    expect(result[0].trainingPeriod).toBe("2026.07.01 ~ 2026.09.30")
  })
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

describe("calculateCurrentCourseRevenue", () => {
  it("등록 당시 금액이 아니라 최신 강좌 가격으로 등록 매출을 계산한다", () => {
    const source = application("a1", 1, "010-0000-0001", "등록");
    source.registered_at = "2026-06-15T09:00:00+09:00";
    source.registered_price = 100000;
    const changedCourses = courses.map((course) =>
      course.id === 1 ? { ...course, price: 150000 } : course
    );

    expect(
      calculateCurrentCourseRevenue([source], changedCourses, {
        start: "2026-06-01",
        end_exclusive: "2026-07-01",
      })
    ).toBe(150000);
  });

  it("선택된 기간 밖에 등록된 신청자는 매출 계산에서 제외한다", () => {
    const source = application("a1", 1, "010-0000-0001", "등록");
    source.registered_at = "2026-05-31T23:59:59+09:00";

    expect(
      calculateCurrentCourseRevenue([source], courses, {
        start: "2026-06-01",
        end_exclusive: "2026-07-01",
      })
    ).toBe(0);
  });
});

describe("buildCourseMetricBreakdown", () => {
  it("강좌별 이번 달 신청, 등록, 상담 상태, 현재 가격 기준 매출을 계산한다", () => {
    const registered = application("a1", 1, "010-0000-0001", "등록");
    registered.created_at = "2026-06-10T09:00:00+09:00";
    registered.registered_at = "2026-06-15T09:00:00+09:00";
    registered.registered_price = 100000;

    const consulted = application("a2", 1, "010-0000-0002");
    consulted.created_at = "2026-06-11T09:00:00+09:00";
    consulted.status = "상담예정";
    consulted.scheduled_date = "2026-06-20";

    const oldApplication = application("a3", 1, "010-0000-0003");
    oldApplication.created_at = "2026-05-30T09:00:00+09:00";

    const changedCourses = courses.map((course) =>
      course.id === 1 ? { ...course, price: 150000 } : course
    );

    expect(
      buildCourseMetricBreakdown(
        [registered, consulted, oldApplication],
        changedCourses,
        { start: "2026-06-01", end_exclusive: "2026-07-01" }
      )[0]
    ).toMatchObject({
      applications: 2,
      registrations: 1,
      consultations: 1,
      pending: 2,
      revenue: 150000,
    });
  });
});
