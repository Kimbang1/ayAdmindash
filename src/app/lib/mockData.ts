import type {
  AdminStats,
  Application,
  CallbackLog,
  ConsultationLog,
  CourseConfig,
  GetLogsResponse,
  RevenueComparisonDetail,
  RevenueComparisonParams,
  RevenueComparisonPeriod,
  RevenueComparisonResponse,
  SecurityLog,
} from './types'
import { calcAge } from './transform'

const MOCK_TOKEN = 'mock-admin-token'

type MockState = {
  courses: CourseConfig[]
  applications: Application[]
  consultationLogs: ConsultationLog[]
  callbackLogs: CallbackLog[]
  securityLogs: SecurityLog[]
}

class MockApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'MockApiError'
    this.status = status
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function makeTimestamp(date: string, time: string): string {
  return `${date}T${time}+09:00`
}

function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NaN
  const normalized = value.length === 10 ? `${value}T00:00:00+09:00` : value
  return Date.parse(normalized)
}

function inRange(value: string | null | undefined, start: string, endExclusive: string): boolean {
  const current = toMillis(value)
  const startMs = toMillis(start)
  const endMs = toMillis(endExclusive)
  return Number.isFinite(current) && current >= startMs && current < endMs
}

function monthBounds(monthKey: string): { start: string; endExclusive: string } {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    start: makeTimestamp(`${yearStr}-${monthStr}-01`, '00:00:00'),
    endExclusive: makeTimestamp(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`, '00:00:00'),
  }
}

function quarterBounds(quarterKey: string): { start: string; endExclusive: string } {
  const [yearStr, quarterStr] = quarterKey.split('-')
  const year = Number(yearStr)
  const quarter = Number(quarterStr.slice(1))
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 3
  const nextYear = endMonth > 12 ? year + 1 : year
  const normalizedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth
  return {
    start: makeTimestamp(`${year}-${String(startMonth).padStart(2, '0')}-01`, '00:00:00'),
    endExclusive: makeTimestamp(`${nextYear}-${String(normalizedEndMonth).padStart(2, '0')}-01`, '00:00:00'),
  }
}

function yearBounds(yearKey: string): { start: string; endExclusive: string } {
  const year = Number(yearKey)
  return {
    start: makeTimestamp(`${year}-01-01`, '00:00:00'),
    endExclusive: makeTimestamp(`${year + 1}-01-01`, '00:00:00'),
  }
}

function rangeDays(start: string, endExclusive: string): string[] {
  const days: string[] = []
  const current = new Date(start)
  const end = new Date(endExclusive)

  while (current < end) {
    days.push(current.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function formatMonthLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-')
  return `${year}.${month}`
}

function formatQuarterLabel(periodKey: string): string {
  const [year, quarter] = periodKey.split('-')
  return `${year} ${quarter}`
}

function iteratePeriods(
  granularity: RevenueComparisonParams['granularity'],
  start: string,
  end: string
): string[] {
  if (granularity === 'year') {
    const from = Number(start)
    const to = Number(end)
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return []
    return Array.from({ length: to - from + 1 }, (_, index) => String(from + index))
  }

  if (granularity === 'quarter') {
    const [startYear, startQuarterRaw] = start.split('-')
    const [endYear, endQuarterRaw] = end.split('-')
    const startIndex = Number(startYear) * 4 + Number(startQuarterRaw.slice(1)) - 1
    const endIndex = Number(endYear) * 4 + Number(endQuarterRaw.slice(1)) - 1
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || startIndex > endIndex) return []

    return Array.from({ length: endIndex - startIndex + 1 }, (_, index) => {
      const current = startIndex + index
      const year = Math.floor(current / 4)
      const quarter = (current % 4) + 1
      return `${year}-Q${quarter}`
    })
  }

  const [startYearStr, startMonthStr] = start.split('-')
  const [endYearStr, endMonthStr] = end.split('-')
  let year = Number(startYearStr)
  let month = Number(startMonthStr)
  const endYear = Number(endYearStr)
  const endMonth = Number(endMonthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(endYear) || !Number.isFinite(endMonth)) return []

  const months: string[] = []
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      year += 1
      month = 1
    }
  }
  return months
}

function ageBand(age: number): string {
  if (age < 20) return '10대'
  if (age < 30) return '20대'
  if (age < 40) return '30대'
  if (age < 50) return '40대'
  return '50대+'
}

function extractHour(value: string): number {
  const match = value.match(/T(\d{2}):/)
  return match ? Number(match[1]) : Number.NaN
}

function createApplication(input: {
  id: string
  created_at: string
  course_id: number
  name: string
  birth_date: string
  gender: Application['gender']
  phone: string
  address: string
  military: string | null
  has_training_card: boolean
  national_employment: boolean
  employment_hours: string
  motivation: string
  status: Application['status']
  enrollment_status: Application['enrollment_status']
  registered_at: string | null
  registered_price: number | null
  memo: string | null
  kakao_link: string | null
  scheduled_date: string | null
  is_blacklisted: boolean
  blacklist_reason: string | null
  enrollment_date: string | null
}): Application {
  const courseMap: Record<number, Application['courses']> = {
    1: { id: 1, slug: 'frontend', name: 'Frontend Practice', capacity: 24, price: 1800000 },
    2: { id: 2, slug: 'data', name: 'Data Analysis Basics', capacity: 20, price: 1600000 },
    3: { id: 3, slug: 'ux', name: 'UI UX Project', capacity: 18, price: 1500000 },
    4: { id: 4, slug: 'backend', name: 'Backend Advanced', capacity: 16, price: 2000000 },
  }

  return { ...input, courses: courseMap[input.course_id] }
}

function buildTimelineApplications(): Application[] {
  return [
    createApplication({
      id: 'app-2001',
      created_at: makeTimestamp('2024-01-10', '09:00:00'),
      course_id: 1,
      name: 'Jisoo Han',
      birth_date: '2008-02-14',
      gender: '여',
      phone: '010-2200-2001',
      address: 'Seoul',
      military: null,
      has_training_card: true,
      national_employment: true,
      employment_hours: 'afternoon',
      motivation: 'starter course',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2024-01-18', '14:00:00'),
      registered_price: 1800000,
      memo: 'long range data',
      kakao_link: 'https://pf.kakao.com/_extra1',
      scheduled_date: '2024-01-12',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2024-01-18',
    }),
    createApplication({
      id: 'app-2002',
      created_at: makeTimestamp('2024-03-22', '10:10:00'),
      course_id: 2,
      name: 'Minho Park',
      birth_date: '1997-11-30',
      gender: '남',
      phone: '010-2200-2002',
      address: 'Busan',
      military: '복무 완료',
      has_training_card: false,
      national_employment: true,
      employment_hours: 'morning',
      motivation: 'data role switch',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'spring lead',
      kakao_link: 'https://pf.kakao.com/_extra2',
      scheduled_date: '2024-03-28',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
    createApplication({
      id: 'app-2003',
      created_at: makeTimestamp('2024-06-11', '13:20:00'),
      course_id: 3,
      name: 'Sora Kim',
      birth_date: '1983-05-03',
      gender: '여',
      phone: '010-2200-2003',
      address: 'Incheon',
      military: null,
      has_training_card: true,
      national_employment: true,
      employment_hours: 'weekend',
      motivation: 'portfolio rebuild',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2024-06-18', '16:10:00'),
      registered_price: 1500000,
      memo: 'summer cohort',
      kakao_link: 'https://pf.kakao.com/_extra3',
      scheduled_date: '2024-06-15',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2024-06-18',
    }),
    createApplication({
      id: 'app-2004',
      created_at: makeTimestamp('2024-09-05', '15:40:00'),
      course_id: 4,
      name: 'Hyejin Choi',
      birth_date: '1974-08-19',
      gender: '여',
      phone: '010-2200-2004',
      address: 'Daegu',
      military: null,
      has_training_card: true,
      national_employment: false,
      employment_hours: 'night',
      motivation: 'backend basics',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'q3 interest',
      kakao_link: 'https://pf.kakao.com/_extra4',
      scheduled_date: '2024-09-10',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
    createApplication({
      id: 'app-2005',
      created_at: makeTimestamp('2024-12-16', '11:25:00'),
      course_id: 1,
      name: 'Joon Seo',
      birth_date: '1969-01-08',
      gender: '남',
      phone: '010-2200-2005',
      address: 'Seoul',
      military: '복무 완료',
      has_training_card: false,
      national_employment: true,
      employment_hours: 'morning',
      motivation: 'late career switch',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2024-12-24', '10:05:00'),
      registered_price: 1800000,
      memo: 'winter cohort',
      kakao_link: 'https://pf.kakao.com/_extra5',
      scheduled_date: '2024-12-19',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2024-12-24',
    }),
    createApplication({
      id: 'app-2006',
      created_at: makeTimestamp('2025-02-13', '09:55:00'),
      course_id: 2,
      name: 'Yuna Kang',
      birth_date: '1990-10-22',
      gender: '여',
      phone: '010-2200-2006',
      address: 'Daejeon',
      military: null,
      has_training_card: true,
      national_employment: true,
      employment_hours: 'afternoon',
      motivation: 'new analyst role',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'q1 lead',
      kakao_link: 'https://pf.kakao.com/_extra6',
      scheduled_date: '2025-02-18',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
    createApplication({
      id: 'app-2007',
      created_at: makeTimestamp('2025-04-27', '14:15:00'),
      course_id: 3,
      name: 'Hyun Woo',
      birth_date: '2002-07-11',
      gender: '남',
      phone: '010-2200-2007',
      address: 'Ulsan',
      military: null,
      has_training_card: true,
      national_employment: true,
      employment_hours: 'weekend',
      motivation: 'ux practice',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2025-05-03', '12:00:00'),
      registered_price: 1500000,
      memo: 'q2 conversion',
      kakao_link: 'https://pf.kakao.com/_extra7',
      scheduled_date: '2025-04-29',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2025-05-03',
    }),
    createApplication({
      id: 'app-2008',
      created_at: makeTimestamp('2025-07-08', '08:40:00'),
      course_id: 4,
      name: 'Seoyeon Lim',
      birth_date: '1986-03-17',
      gender: '여',
      phone: '010-2200-2008',
      address: 'Seoul',
      military: null,
      has_training_card: false,
      national_employment: false,
      employment_hours: 'night',
      motivation: 'backend depth',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'q3 backlog',
      kakao_link: 'https://pf.kakao.com/_extra8',
      scheduled_date: '2025-07-14',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
    createApplication({
      id: 'app-2009',
      created_at: makeTimestamp('2025-10-19', '17:05:00'),
      course_id: 1,
      name: 'Taemin Oh',
      birth_date: '1979-12-02',
      gender: '남',
      phone: '010-2200-2009',
      address: 'Gwangju',
      military: '복무 완료',
      has_training_card: true,
      national_employment: true,
      employment_hours: 'weekend',
      motivation: 'frontend refresh',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2025-10-25', '10:30:00'),
      registered_price: 1800000,
      memo: 'q4 registration',
      kakao_link: 'https://pf.kakao.com/_extra9',
      scheduled_date: '2025-10-21',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2025-10-25',
    }),
    createApplication({
      id: 'app-2010',
      created_at: makeTimestamp('2026-02-04', '09:25:00'),
      course_id: 2,
      name: 'Mina Cho',
      birth_date: '2004-09-09',
      gender: '여',
      phone: '010-2200-2010',
      address: 'Seoul',
      military: null,
      has_training_card: true,
      national_employment: true,
      employment_hours: 'morning',
      motivation: 'data internship prep',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'q1 2026',
      kakao_link: 'https://pf.kakao.com/_extra10',
      scheduled_date: '2026-02-10',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
    createApplication({
      id: 'app-2011',
      created_at: makeTimestamp('2026-04-11', '13:35:00'),
      course_id: 3,
      name: 'Jaeho Lee',
      birth_date: '1995-06-30',
      gender: '남',
      phone: '010-2200-2011',
      address: 'Busan',
      military: '복무 완료',
      has_training_card: true,
      national_employment: false,
      employment_hours: 'afternoon',
      motivation: 'design system work',
      status: '상담완료',
      enrollment_status: '등록',
      registered_at: makeTimestamp('2026-04-18', '14:55:00'),
      registered_price: 1500000,
      memo: 'q2 2026',
      kakao_link: 'https://pf.kakao.com/_extra11',
      scheduled_date: '2026-04-14',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: '2026-04-18',
    }),
    createApplication({
      id: 'app-2012',
      created_at: makeTimestamp('2026-06-21', '18:20:00'),
      course_id: 4,
      name: 'Hana Yu',
      birth_date: '1968-04-04',
      gender: '여',
      phone: '010-2200-2012',
      address: 'Seoul',
      military: null,
      has_training_card: false,
      national_employment: true,
      employment_hours: 'night',
      motivation: 'late career backend',
      status: '상담예정',
      enrollment_status: '미등록',
      registered_at: null,
      registered_price: null,
      memo: 'older candidate for age band test',
      kakao_link: 'https://pf.kakao.com/_extra12',
      scheduled_date: '2026-06-26',
      is_blacklisted: false,
      blacklist_reason: null,
      enrollment_date: null,
    }),
  ]
}

function seededState(): MockState {
  return {
    courses: [
      {
        id: 1,
        slug: 'frontend',
        name: '프론트엔드 실무',
        recruitment_start: '2026-06-01',
        recruitment_end: '2026-06-30',
        training_start: '2026-07-08',
        training_end: '2026-08-12',
        capacity: 24,
        price: 1800000,
        instructor: '김민수',
        location: '서울 강남',
        is_active: true,
      },
      {
        id: 2,
        slug: 'data',
        name: '데이터 분석 기초',
        recruitment_start: '2026-06-03',
        recruitment_end: '2026-06-28',
        training_start: '2026-07-15',
        training_end: '2026-08-19',
        capacity: 20,
        price: 1600000,
        instructor: '이서연',
        location: '서울 종로',
        is_active: true,
      },
      {
        id: 3,
        slug: 'ux',
        name: 'UI/UX 프로젝트',
        recruitment_start: '2026-05-25',
        recruitment_end: '2026-06-20',
        training_start: '2026-07-01',
        training_end: '2026-08-05',
        capacity: 18,
        price: 1500000,
        instructor: '박지훈',
        location: '부산 해운대',
        is_active: true,
      },
      {
        id: 4,
        slug: 'backend',
        name: '백엔드 심화',
        recruitment_start: '2026-06-10',
        recruitment_end: '2026-07-05',
        training_start: '2026-07-22',
        training_end: '2026-08-26',
        capacity: 16,
        price: 2000000,
        instructor: '최유진',
        location: '대전 유성',
        is_active: true,
      },
    ],
    applications: [
      {
        id: 'app-1001',
        created_at: makeTimestamp('2026-06-02', '09:15:00'),
        course_id: 1,
        name: '김하늘',
        birth_date: '1998-04-12',
        gender: '여',
        phone: '010-1111-2001',
        address: '서울시 마포구',
        military: null,
        has_training_card: true,
        national_employment: true,
        employment_hours: '평일 저녁',
        motivation: '프론트엔드 전환 준비',
        status: '상담예정',
        enrollment_status: '미등록',
        registered_at: null,
        registered_price: null,
        memo: '첫 상담 예약',
        kakao_link: 'https://pf.kakao.com/_test1',
        scheduled_date: '2026-06-24',
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: null,
        courses: { id: 1, slug: 'frontend', name: '프론트엔드 실무', capacity: 24, price: 1800000 },
      },
      {
        id: 'app-1002',
        created_at: makeTimestamp('2026-06-03', '11:30:00'),
        course_id: 1,
        name: '이준호',
        birth_date: '1992-09-08',
        gender: '남',
        phone: '010-1111-2002',
        address: '경기도 성남시',
        military: '복무 완료',
        has_training_card: true,
        national_employment: true,
        employment_hours: '주말 가능',
        motivation: '이직 포트폴리오 보강',
        status: '상담완료',
        enrollment_status: '등록',
        registered_at: makeTimestamp('2026-06-05', '14:10:00'),
        registered_price: 1800000,
        memo: '등록 완료',
        kakao_link: 'https://pf.kakao.com/_test2',
        scheduled_date: '2026-06-04',
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: '2026-06-05',
        courses: { id: 1, slug: 'frontend', name: '프론트엔드 실무', capacity: 24, price: 1800000 },
      },
      {
        id: 'app-1003',
        created_at: makeTimestamp('2026-06-04', '10:05:00'),
        course_id: 2,
        name: '박세은',
        birth_date: '1989-01-22',
        gender: '여',
        phone: '010-1111-2003',
        address: '인천시 연수구',
        military: null,
        has_training_card: false,
        national_employment: true,
        employment_hours: '오전',
        motivation: '데이터 분석 직무 준비',
        status: '상담예정',
        enrollment_status: '미등록',
        registered_at: null,
        registered_price: null,
        memo: '중복 문의 이력 확인 필요',
        kakao_link: 'https://pf.kakao.com/_test3',
        scheduled_date: '2026-06-25',
        is_blacklisted: true,
        blacklist_reason: '중복 신청 확인',
        enrollment_date: null,
        courses: { id: 2, slug: 'data', name: '데이터 분석 기초', capacity: 20, price: 1600000 },
      },
      {
        id: 'app-1004',
        created_at: makeTimestamp('2026-06-05', '16:20:00'),
        course_id: 2,
        name: '정민재',
        birth_date: '1996-11-03',
        gender: '남',
        phone: '010-1111-2004',
        address: '대구시 수성구',
        military: '면제',
        has_training_card: true,
        national_employment: false,
        employment_hours: '야간',
        motivation: '실무 데이터 역량 강화',
        status: '상담완료',
        enrollment_status: '미등록',
        registered_at: null,
        registered_price: null,
        memo: '추가 자료 발송',
        kakao_link: 'https://pf.kakao.com/_test4',
        scheduled_date: '2026-06-09',
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: null,
        courses: { id: 2, slug: 'data', name: '데이터 분석 기초', capacity: 20, price: 1600000 },
      },
      {
        id: 'app-1005',
        created_at: makeTimestamp('2026-06-06', '13:45:00'),
        course_id: 3,
        name: '최도윤',
        birth_date: '1990-06-19',
        gender: '남',
        phone: '010-1111-2005',
        address: '광주시 서구',
        military: null,
        has_training_card: true,
        national_employment: true,
        employment_hours: '재택 가능',
        motivation: 'UI 포트폴리오 완성',
        status: '상담완료',
        enrollment_status: '등록',
        registered_at: makeTimestamp('2026-06-08', '09:50:00'),
        registered_price: 1500000,
        memo: '등록 확인',
        kakao_link: 'https://pf.kakao.com/_test5',
        scheduled_date: '2026-06-11',
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: '2026-06-08',
        courses: { id: 3, slug: 'ux', name: 'UI/UX 프로젝트', capacity: 18, price: 1500000 },
      },
      {
        id: 'app-1006',
        created_at: makeTimestamp('2026-06-10', '15:00:00'),
        course_id: 3,
        name: '한지우',
        birth_date: '2000-02-14',
        gender: '여',
        phone: '010-1111-2006',
        address: '울산시 남구',
        military: null,
        has_training_card: true,
        national_employment: true,
        employment_hours: '주중 오전',
        motivation: '신입 디자이너 전환',
        status: '접수',
        enrollment_status: '미등록',
        registered_at: null,
        registered_price: null,
        memo: '아직 상담 전',
        kakao_link: 'https://pf.kakao.com/_test6',
        scheduled_date: null,
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: null,
        courses: { id: 3, slug: 'ux', name: 'UI/UX 프로젝트', capacity: 18, price: 1500000 },
      },
      {
        id: 'app-1007',
        created_at: makeTimestamp('2026-06-12', '10:40:00'),
        course_id: 4,
        name: '오세훈',
        birth_date: '1986-12-09',
        gender: '남',
        phone: '010-1111-2007',
        address: '서울시 강서구',
        military: '복무 완료',
        has_training_card: false,
        national_employment: false,
        employment_hours: '야간',
        motivation: '백엔드 포트폴리오 정리',
        status: '상담예정',
        enrollment_status: '미등록',
        registered_at: null,
        registered_price: null,
        memo: '연락처 허위 확인',
        kakao_link: 'https://pf.kakao.com/_test7',
        scheduled_date: '2026-06-18',
        is_blacklisted: true,
        blacklist_reason: '허위 연락처',
        enrollment_date: null,
        courses: { id: 4, slug: 'backend', name: '백엔드 심화', capacity: 16, price: 2000000 },
      },
      {
        id: 'app-1008',
        created_at: makeTimestamp('2026-06-14', '12:05:00'),
        course_id: 4,
        name: '배서준',
        birth_date: '1994-07-01',
        gender: '남',
        phone: '010-1111-2008',
        address: '경기도 수원시',
        military: '복무 완료',
        has_training_card: true,
        national_employment: true,
        employment_hours: '주말',
        motivation: '서버 개발 실전 정리',
        status: '상담완료',
        enrollment_status: '등록',
        registered_at: makeTimestamp('2026-06-17', '11:20:00'),
        registered_price: 2000000,
        memo: '최종 등록',
        kakao_link: 'https://pf.kakao.com/_test8',
        scheduled_date: '2026-06-16',
        is_blacklisted: false,
        blacklist_reason: null,
        enrollment_date: '2026-06-17',
        courses: { id: 4, slug: 'backend', name: '백엔드 심화', capacity: 16, price: 2000000 },
      },
      ...buildTimelineApplications(),
    ],
    consultationLogs: [
      {
        id: 'c-log-1',
        application_id: 'app-1001',
        content: '초기 상담 진행. 커리큘럼 안내 완료.',
        consultation_date: '2026-06-02',
        created_at: makeTimestamp('2026-06-02', '09:30:00'),
      },
      {
        id: 'c-log-2',
        application_id: 'app-1002',
        content: '1차 상담 완료. 수강료 및 일정 안내.',
        consultation_date: '2026-06-03',
        created_at: makeTimestamp('2026-06-03', '11:45:00'),
      },
      {
        id: 'c-log-3',
        application_id: 'app-1002',
        content: '추가 문의 응대 후 등록 확정.',
        consultation_date: '2026-06-05',
        created_at: makeTimestamp('2026-06-05', '14:20:00'),
      },
      {
        id: 'c-log-4',
        application_id: 'app-1005',
        content: '포트폴리오 검토 후 상담 메모 작성.',
        consultation_date: '2026-06-07',
        created_at: makeTimestamp('2026-06-07', '10:00:00'),
      },
      {
        id: 'c-log-5',
        application_id: 'app-1007',
        content: '블랙리스트 검토 사유 등록.',
        consultation_date: '2026-06-13',
        created_at: makeTimestamp('2026-06-13', '16:10:00'),
      },
    ],
    callbackLogs: [
      {
        id: 'cb-log-1',
        application_id: 'app-1002',
        callback_date: '2026-06-04',
        memo: '등록 전후 일정 확인',
        created_at: makeTimestamp('2026-06-04', '10:10:00'),
      },
      {
        id: 'cb-log-2',
        application_id: 'app-1008',
        callback_date: '2026-06-16',
        memo: '입금 확인 후 최종 안내',
        created_at: makeTimestamp('2026-06-16', '11:30:00'),
      },
    ],
    securityLogs: [
      {
        id: 'sec-log-1',
        created_at: makeTimestamp('2026-06-14', '08:00:00'),
        event_type: 'admin.login',
        result: 'success',
        ip_address: '127.0.0.1',
        user_agent: 'Mock Browser',
        details: { username: 'admin' },
      },
      {
        id: 'sec-log-2',
        created_at: makeTimestamp('2026-06-14', '08:05:00'),
        event_type: 'admin.update_application',
        result: 'success',
        ip_address: '127.0.0.1',
        user_agent: 'Mock Browser',
        details: { application_id: 'app-1002' },
      },
      {
        id: 'sec-log-3',
        created_at: makeTimestamp('2026-06-16', '12:00:00'),
        event_type: 'admin.export',
        result: 'success',
        ip_address: '127.0.0.1',
        user_agent: 'Mock Browser',
        details: { rows: 8 },
      },
    ],
  }
}

const state = seededState()

function ensureAuth(token: string): void {
  if (token !== MOCK_TOKEN) throw new MockApiError('인증이 필요합니다.', 401)
}

function pickCoursePrice(application: Application): number {
  return application.registered_price ?? application.courses.price ?? 0
}

function buildStats(month?: string): AdminStats {
  const targetMonth = month ?? '2026-06'
  const period = monthBounds(targetMonth)
  const scopedApplications = state.applications.filter((application) => inRange(application.created_at, period.start, period.endExclusive))
  const scopedRegistrations = scopedApplications.filter(
    (application) => application.enrollment_status === '등록' && inRange(application.registered_at, period.start, period.endExclusive)
  )
  const scopedConsultations = state.consultationLogs.filter((log) => inRange(log.consultation_date, period.start, period.endExclusive))

  const consultationStatuses = scopedApplications.reduce<AdminStats['consultation_statuses']>(
    (acc, application) => {
      acc[application.status] += 1
      return acc
    },
    { 접수: 0, 상담예정: 0, 상담완료: 0 } as AdminStats['consultation_statuses']
  )

  const enrollmentStatuses = scopedApplications.reduce<AdminStats['enrollment_statuses']>(
    (acc, application) => {
      acc[application.enrollment_status] += 1
      return acc
    },
    { 미등록: 0, 등록: 0, 취소: 0 } as AdminStats['enrollment_statuses']
  )

  const consultationDaily = rangeDays(period.start, period.endExclusive).map((date) => ({
    date,
    count: scopedConsultations.filter((log) => log.consultation_date === date).length,
  }))

  const consultationHourly = Array.from({ length: 24 }, (_, hour) => {
    const hourKey = String(hour).padStart(2, '0')
    return {
      hour: `${hourKey}:00`,
      count: scopedConsultations.filter((log) => {
        const createdHour = extractHour(log.created_at)
        return createdHour === hour
      }).length,
    }
  }).filter((row) => row.count > 0)

  const ageBuckets = new Map<string, number>()
  for (const application of scopedApplications) {
    const band = ageBand(calcAge(application.birth_date))
    ageBuckets.set(band, (ageBuckets.get(band) ?? 0) + 1)
  }

  const age_distribution = Array.from(ageBuckets.entries()).map(([label, count]) => ({ label, count }))

  const courses = state.courses.map((course) => {
    const courseApps = scopedApplications.filter((application) => application.course_id === course.id)
    const registered = scopedRegistrations.filter((application) => application.course_id === course.id)
    const averageAge =
      courseApps.length === 0
        ? null
        : Math.round(courseApps.reduce((sum, application) => sum + calcAge(application.birth_date), 0) / courseApps.length)

    return {
      course_id: course.id,
      name: course.name,
      applications: courseApps.length,
      registered: registered.length,
      registration_rate: courseApps.length === 0 ? 0 : Math.round((registered.length / courseApps.length) * 100),
      average_age: averageAge,
    }
  })

  return {
    period: {
      month: targetMonth,
      start: period.start,
      end_exclusive: period.endExclusive,
    },
    generated_at: makeTimestamp('2026-06-23', '10:00:00'),
    timezone: 'Asia/Seoul',
    summary: {
      applications: scopedApplications.length,
      registrations: scopedRegistrations.length,
      revenue: scopedRegistrations.reduce((sum, application) => sum + pickCoursePrice(application), 0),
      consultations: scopedConsultations.length,
    },
    consultation_statuses: consultationStatuses,
    enrollment_statuses: enrollmentStatuses,
    consultation_daily: consultationDaily,
    consultation_hourly: consultationHourly,
    age_distribution,
    courses,
  }
}

function parsePeriod(
  granularity: RevenueComparisonParams['granularity'],
  periodKey: string
): { start: string; endExclusive: string; label: string } {
  if (granularity === 'quarter') {
    const bounds = quarterBounds(periodKey)
    return { ...bounds, label: formatQuarterLabel(periodKey) }
  }
  if (granularity === 'year') {
    const bounds = yearBounds(periodKey)
    return { ...bounds, label: periodKey }
  }
  const bounds = monthBounds(periodKey)
  return { ...bounds, label: formatMonthLabel(periodKey) }
}

function buildRevenueComparison(params: RevenueComparisonParams): RevenueComparisonResponse {
  const periodKeys = iteratePeriods(params.granularity, params.start, params.end)
  const periods: RevenueComparisonPeriod[] = []
  const details: RevenueComparisonDetail[] = []

  for (const periodKey of periodKeys) {
    const { start, endExclusive, label } = parsePeriod(params.granularity, periodKey)
    const scopedApplications = state.applications.filter((application) => inRange(application.created_at, start, endExclusive))
    const scopedRegistrations = state.applications.filter(
      (application) => application.enrollment_status === '등록' && inRange(application.registered_at, start, endExclusive)
    )

    periods.push({
      period_key: periodKey,
      period_label: label,
      applications: scopedApplications.length,
      registrations: scopedRegistrations.length,
      revenue: scopedRegistrations.reduce((sum, application) => sum + pickCoursePrice(application), 0),
    })

    const byKey = new Map<string, RevenueComparisonDetail>()
    for (const application of scopedApplications) {
      const course = state.courses.find((row) => row.id === application.course_id)
      const band = ageBand(calcAge(application.birth_date))
      const key = `${periodKey}:${application.course_id}:${band}`
      const row =
        byKey.get(key) ??
        ({
          period_key: periodKey,
          period_label: label,
          course_id: application.course_id,
          course_name: course?.name ?? application.courses.name,
          age_band: band,
          applications: 0,
          registrations: 0,
          revenue: 0,
        } satisfies RevenueComparisonDetail)

      row.applications += 1
      byKey.set(key, row)
    }

    for (const application of scopedRegistrations) {
      const course = state.courses.find((row) => row.id === application.course_id)
      const band = ageBand(calcAge(application.birth_date))
      const key = `${periodKey}:${application.course_id}:${band}`
      const row =
        byKey.get(key) ??
        ({
          period_key: periodKey,
          period_label: label,
          course_id: application.course_id,
          course_name: course?.name ?? application.courses.name,
          age_band: band,
          applications: 0,
          registrations: 0,
          revenue: 0,
        } satisfies RevenueComparisonDetail)

      row.registrations += 1
      row.revenue += pickCoursePrice(application)
      byKey.set(key, row)
    }

    details.push(...Array.from(byKey.values()))
  }

  return {
    periods,
    details,
    generated_at: makeTimestamp('2026-06-23', '10:00:00'),
    timezone: 'Asia/Seoul',
  }
}

function assertToken(token: string): void {
  ensureAuth(token)
}

export function mockLogin(password: string): Promise<{ token: string }> {
  if (!password.trim()) throw new MockApiError('비밀번호를 입력해 주세요.', 401)
  return Promise.resolve({ token: MOCK_TOKEN })
}

export function mockLogout(token: string): Promise<{ ok: boolean }> {
  assertToken(token)
  return Promise.resolve({ ok: true })
}

export function mockRefresh(token: string): Promise<{ token: string }> {
  assertToken(token)
  return Promise.resolve({ token: MOCK_TOKEN })
}

export function mockGetApplications(token: string, courseId?: number): Promise<{ applications: Application[] }> {
  assertToken(token)
  const applications =
    courseId == null || Number.isNaN(courseId)
      ? state.applications
      : state.applications.filter((application) => application.course_id === courseId)
  return Promise.resolve({ applications: clone(applications) })
}

export function mockUpdateApplication(
  token: string,
  body: {
    id: string
    status?: Application['status']
    enrollment_status?: Application['enrollment_status']
    memo?: string
    kakao_link?: string
    scheduled_date?: string | null
    is_blacklisted?: boolean
    blacklist_reason?: string | null
    enrollment_date?: string | null
  }
): Promise<{ ok: boolean; application: Application }> {
  assertToken(token)
  const index = state.applications.findIndex((application) => application.id === body.id)
  if (index === -1) throw new MockApiError('신청서를 찾을 수 없습니다.', 404)

  const current = state.applications[index]
  const next: Application = {
    ...current,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.enrollment_status !== undefined ? { enrollment_status: body.enrollment_status } : {}),
    ...(body.memo !== undefined ? { memo: body.memo } : {}),
    ...(body.kakao_link !== undefined ? { kakao_link: body.kakao_link } : {}),
    ...(body.scheduled_date !== undefined ? { scheduled_date: body.scheduled_date } : {}),
    ...(body.is_blacklisted !== undefined ? { is_blacklisted: body.is_blacklisted } : {}),
    ...(body.blacklist_reason !== undefined ? { blacklist_reason: body.blacklist_reason } : {}),
    ...(body.enrollment_date !== undefined ? { enrollment_date: body.enrollment_date } : {}),
  }

  state.applications[index] = next
  return Promise.resolve({ ok: true, application: clone(next) })
}

export function mockGetBlacklistedApplications(token: string): Promise<{ applications: Application[] }> {
  assertToken(token)
  return Promise.resolve({
    applications: clone(state.applications.filter((application) => application.is_blacklisted)),
  })
}

export function mockGetAdminCourses(token: string): Promise<{ courses: CourseConfig[] }> {
  assertToken(token)
  return Promise.resolve({ courses: clone(state.courses) })
}

export function mockUpdateAdminCourse(
  token: string,
  body: Pick<CourseConfig, 'id'> & Partial<Pick<CourseConfig,
    'name' | 'recruitment_start' | 'recruitment_end' | 'training_start' | 'training_end' |
    'capacity' | 'price' | 'instructor' | 'location' | 'is_active'>>
): Promise<{ course: CourseConfig }> {
  assertToken(token)
  const index = state.courses.findIndex((course) => course.id === body.id)
  if (index === -1) throw new MockApiError('강좌를 찾을 수 없습니다.', 404)
  state.courses[index] = { ...state.courses[index], ...body }
  return Promise.resolve({ course: clone(state.courses[index]) })
}

export function mockCreateCourse(
  token: string,
  body: {
    name: string
    recruitment_start?: string
    recruitment_end?: string
    training_start: string
    training_end: string
    capacity: number
    price: number
    instructor?: string
    location?: string
  }
): Promise<{ course: CourseConfig }> {
  assertToken(token)
  const nextId = Math.max(...state.courses.map((course) => course.id)) + 1
  const course: CourseConfig = {
    id: nextId,
    slug: body.name.toLowerCase().replace(/\s+/g, '-'),
    name: body.name,
    recruitment_start: body.recruitment_start ?? null,
    recruitment_end: body.recruitment_end ?? null,
    training_start: body.training_start,
    training_end: body.training_end,
    capacity: body.capacity,
    price: body.price,
    instructor: body.instructor ?? null,
    location: body.location ?? null,
    is_active: true,
  }
  state.courses.push(course)
  return Promise.resolve({ course: clone(course) })
}

export function mockDeleteCourse(token: string, id: number): Promise<{ ok: boolean }> {
  assertToken(token)
  state.courses = state.courses.filter((course) => course.id !== id)
  return Promise.resolve({ ok: true })
}

export function mockGetAdminStats(token: string, month?: string): Promise<AdminStats> {
  assertToken(token)
  return Promise.resolve(buildStats(month))
}

export function mockGetConsultations(token: string, applicationId: string): Promise<{ logs: ConsultationLog[] }> {
  assertToken(token)
  return Promise.resolve({
    logs: clone(state.consultationLogs.filter((log) => log.application_id === applicationId)),
  })
}

export function mockAddConsultation(
  token: string,
  applicationId: string,
  content: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> {
  assertToken(token)
  const log: ConsultationLog = {
    id: `c-log-${state.consultationLogs.length + 1}`,
    application_id: applicationId,
    content,
    consultation_date: consultationDate,
    created_at: makeTimestamp(consultationDate, '12:00:00'),
  }
  state.consultationLogs.push(log)
  return Promise.resolve({ log: clone(log) })
}

export function mockUpdateConsultationDate(
  token: string,
  logId: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> {
  assertToken(token)
  const index = state.consultationLogs.findIndex((log) => log.id === logId)
  if (index === -1) throw new MockApiError('상담 기록을 찾을 수 없습니다.', 404)
  state.consultationLogs[index] = { ...state.consultationLogs[index], consultation_date: consultationDate }
  return Promise.resolve({ log: clone(state.consultationLogs[index]) })
}

export function mockDeleteConsultation(token: string, logId: string): Promise<{ ok: boolean }> {
  assertToken(token)
  state.consultationLogs = state.consultationLogs.filter((log) => log.id !== logId)
  return Promise.resolve({ ok: true })
}

export function mockGetCallbacks(token: string, applicationId: string): Promise<{ logs: CallbackLog[] }> {
  assertToken(token)
  return Promise.resolve({
    logs: clone(state.callbackLogs.filter((log) => log.application_id === applicationId)),
  })
}

export function mockAddCallback(
  token: string,
  applicationId: string,
  callbackDate: string,
  memo: string
): Promise<{ log: CallbackLog }> {
  assertToken(token)
  const log: CallbackLog = {
    id: `cb-log-${state.callbackLogs.length + 1}`,
    application_id: applicationId,
    callback_date: callbackDate,
    memo,
    created_at: makeTimestamp(callbackDate, '12:00:00'),
  }
  state.callbackLogs.push(log)
  return Promise.resolve({ log: clone(log) })
}

export function mockDeleteCallback(token: string, logId: string): Promise<{ ok: boolean }> {
  assertToken(token)
  state.callbackLogs = state.callbackLogs.filter((log) => log.id !== logId)
  return Promise.resolve({ ok: true })
}

export function mockGetLogs(
  token: string,
  params: { event_type?: string; date_from?: string; limit?: number; offset?: number } = {}
): Promise<GetLogsResponse> {
  assertToken(token)
  let logs = state.securityLogs
  if (params.event_type) logs = logs.filter((log) => log.event_type === params.event_type)
  if (params.date_from) logs = logs.filter((log) => toMillis(log.created_at) >= toMillis(params.date_from))
  const offset = params.offset ?? 0
  const limit = params.limit ?? logs.length
  const sliced = logs.slice(offset, offset + limit)
  return Promise.resolve({
    logs: clone(sliced),
    total: logs.length,
    limit,
    offset,
  })
}

export function mockGetRevenueComparison(
  token: string,
  params: RevenueComparisonParams
): Promise<RevenueComparisonResponse> {
  assertToken(token)
  const periodKeys = iteratePeriods(params.granularity, params.start, params.end)
  const periods: RevenueComparisonPeriod[] = []
  const details: RevenueComparisonDetail[] = []

  for (const periodKey of periodKeys) {
    const { start, endExclusive, label } = parsePeriod(params.granularity, periodKey)
    const scopedApplications = state.applications.filter((application) => inRange(application.created_at, start, endExclusive))
    const scopedRegistrations = state.applications.filter(
      (application) => application.enrollment_status === '등록' && inRange(application.registered_at, start, endExclusive)
    )

    periods.push({
      period_key: periodKey,
      period_label: label,
      applications: scopedApplications.length,
      registrations: scopedRegistrations.length,
      revenue: scopedRegistrations.reduce((sum, application) => sum + pickCoursePrice(application), 0),
    })

    const byKey = new Map<string, RevenueComparisonDetail>()
    for (const application of scopedApplications) {
      const course = state.courses.find((row) => row.id === application.course_id)
      const band = ageBand(calcAge(application.birth_date))
      const key = `${periodKey}:${application.course_id}:${band}`
      const row =
        byKey.get(key) ??
        ({
          period_key: periodKey,
          period_label: label,
          course_id: application.course_id,
          course_name: course?.name ?? application.courses.name,
          age_band: band,
          applications: 0,
          registrations: 0,
          revenue: 0,
        } satisfies RevenueComparisonDetail)
      row.applications += 1
      byKey.set(key, row)
    }

    for (const application of scopedRegistrations) {
      const course = state.courses.find((row) => row.id === application.course_id)
      const band = ageBand(calcAge(application.birth_date))
      const key = `${periodKey}:${application.course_id}:${band}`
      const row =
        byKey.get(key) ??
        ({
          period_key: periodKey,
          period_label: label,
          course_id: application.course_id,
          course_name: course?.name ?? application.courses.name,
          age_band: band,
          applications: 0,
          registrations: 0,
          revenue: 0,
        } satisfies RevenueComparisonDetail)
      row.registrations += 1
      row.revenue += pickCoursePrice(application)
      byKey.set(key, row)
    }

    details.push(...Array.from(byKey.values()))
  }

  return Promise.resolve(buildRevenueComparison(params))
}

export function mockLoginToken(): string {
  return MOCK_TOKEN
}


