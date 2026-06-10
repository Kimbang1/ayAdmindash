import type { Application } from './types'

export interface Course {
  id: string
  title: string
  category: string
  duration: string
  applicants: number
  newApplicants: number
  status: '모집중' | '마감임박' | '마감'
  maxCapacity: number
  startDate: string
  price: number
  monthlyRevenue: number
}

export interface Applicant {
  id: number
  applicationId: string
  name: string
  age: number
  phone: string
  email: string
  appliedDate: string
  scheduledDate: string | null
  rawStatus: '접수' | '상담예정' | '상담완료'
  status: '확정' | '대기' | '취소'
}

const COURSES_META: Record<number, { title: string; category: string; duration: string; maxCapacity: number; price: number }> = {
  1: { title: '컴퓨터 활용 능력', category: '컴퓨터', duration: '3개월', maxCapacity: 30, price: 0 },
  2: { title: 'Figma UI/UX 디자인', category: '디자인', duration: '3개월', maxCapacity: 30, price: 0 },
  3: { title: '전산세무 회계', category: '세무', duration: '4개월', maxCapacity: 30, price: 0 },
  4: { title: '영상 편집반', category: '영상', duration: '2개월', maxCapacity: 30, price: 0 },
}

export const COURSE_IDS = [1, 2, 3, 4] as const

export function getCourseMeta(courseId: number) {
  return COURSES_META[courseId] ?? { title: '알 수 없는 강좌', category: '기타', duration: '—', maxCapacity: 30, price: 0 }
}

export function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function mapApplicantStatus(raw: Application['status']): Applicant['status'] {
  return raw === '상담완료' ? '확정' : '대기'
}

function computeCourseStatus(count: number, max: number): Course['status'] {
  const rate = count / max
  if (rate >= 1) return '마감'
  if (rate >= 0.9) return '마감임박'
  return '모집중'
}

function isThisMonth(dateStr: string, now: Date): boolean {
  const date = new Date(dateStr)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export function toCourses(applications: Application[]): Course[] {
  const now = new Date()
  return COURSE_IDS.map((courseId) => {
    const meta = COURSES_META[courseId]
    const apps = applications.filter((a) => a.course_id === courseId)
    const newApplicants = apps.filter((a) => isThisMonth(a.created_at, now)).length
    const monthlyConfirmed = apps.filter(
      (a) => isThisMonth(a.created_at, now) && a.status === '상담완료'
    ).length
    return {
      id: String(courseId),
      title: meta.title,
      category: meta.category,
      duration: meta.duration,
      applicants: apps.length,
      newApplicants,
      status: computeCourseStatus(apps.length, meta.maxCapacity),
      maxCapacity: meta.maxCapacity,
      startDate: '',
      price: meta.price,
      monthlyRevenue: monthlyConfirmed * meta.price,
    }
  })
}

export function toApplicants(applications: Application[]): Applicant[] {
  return applications.map((app, i) => ({
    id: i + 1,
    applicationId: app.id,
    name: app.name,
    age: calcAge(app.birth_date),
    phone: app.phone,
    email: '',
    appliedDate: app.created_at.split('T')[0],
    scheduledDate: app.scheduled_date,
    rawStatus: app.status,
    status: mapApplicantStatus(app.status),
  }))
}
