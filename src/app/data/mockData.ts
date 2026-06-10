export interface Applicant {
  id: number;
  name: string;
  age: number;
  phone: string;
  email: string;
  appliedDate: string;
  status: "확정" | "대기" | "취소";
}

export interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  applicants: number;
  newApplicants: number;
  status: "모집중" | "마감임박" | "마감";
  maxCapacity: number;
  startDate: string;
}

export const courses: Course[] = [
  { id: "c1", title: "웹 개발 완전 정복: HTML부터 React까지", category: "웹 개발", duration: "24시간", applicants: 127, newApplicants: 8, status: "모집중", maxCapacity: 150, startDate: "2026-07-01" },
  { id: "c2", title: "파이썬으로 시작하는 데이터 사이언스", category: "데이터", duration: "18시간", applicants: 94, newApplicants: 3, status: "모집중", maxCapacity: 120, startDate: "2026-07-08" },
  { id: "c3", title: "UI/UX 디자인 실전 프로젝트", category: "디자인", duration: "12시간", applicants: 68, newApplicants: 0, status: "마감임박", maxCapacity: 70, startDate: "2026-06-20" },
  { id: "c4", title: "자바스크립트 마스터 클래스", category: "프로그래밍", duration: "20시간", applicants: 215, newApplicants: 12, status: "모집중", maxCapacity: 250, startDate: "2026-07-15" },
  { id: "c5", title: "React Native 모바일 앱 개발", category: "모바일", duration: "16시간", applicants: 52, newApplicants: 2, status: "모집중", maxCapacity: 100, startDate: "2026-07-22" },
  { id: "c6", title: "머신러닝 입문부터 심화까지", category: "AI/ML", duration: "28시간", applicants: 43, newApplicants: 0, status: "마감", maxCapacity: 43, startDate: "2026-06-15" },
  { id: "c7", title: "클라우드 아키텍처 설계", category: "인프라", duration: "22시간", applicants: 78, newApplicants: 6, status: "모집중", maxCapacity: 100, startDate: "2026-07-29" },
  { id: "c8", title: "Figma 디자인 시스템 구축", category: "디자인", duration: "10시간", applicants: 31, newApplicants: 1, status: "마감임박", maxCapacity: 35, startDate: "2026-06-25" },
];

function generateApplicants(courseId: string, count: number): Applicant[] {
  const names = ["김민준", "이서연", "박지호", "최수아", "정도윤", "강지원", "윤하늘", "조민서", "한예린", "오승현", "임채원", "신지수", "류건우", "배나영", "황민재", "전소희", "남도현", "홍예지", "문성준", "백다은"];
  const statuses: ("확정" | "대기" | "취소")[] = ["확정", "확정", "확정", "대기", "취소"];
  const result: Applicant[] = [];

  // seed dates in June 2026
  const baseDates = [
    "2026-06-01", "2026-06-02", "2026-06-02", "2026-06-03",
    "2026-06-04", "2026-06-05", "2026-06-05", "2026-06-06",
    "2026-06-07", "2026-06-07", "2026-06-08", "2026-06-08",
    "2026-06-09", "2026-06-10", "2026-06-10", "2026-06-11",
    "2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15",
  ];

  for (let i = 0; i < Math.min(count, 20); i++) {
    const nameIdx = (parseInt(courseId.replace("c", "")) * 3 + i) % names.length;
    result.push({
      id: i + 1,
      name: names[nameIdx],
      age: 20 + ((parseInt(courseId.replace("c", "")) + i * 7) % 30),
      phone: `010-${String(1000 + i * 37).slice(0, 4)}-${String(5000 + i * 53).slice(0, 4)}`,
      email: `user${i + 1}@email.com`,
      appliedDate: baseDates[i % baseDates.length],
      status: statuses[i % statuses.length],
    });
  }
  return result;
}

export const applicantsByCoruse: Record<string, Applicant[]> = Object.fromEntries(
  courses.map((c) => [c.id, generateApplicants(c.id, Math.min(c.applicants, 20))])
);
