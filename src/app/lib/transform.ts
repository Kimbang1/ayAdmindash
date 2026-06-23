import type { AdminStats, Application, CourseConfig } from './types'

export interface Course {
  id: string
  title: string
  category: string
  trainingPeriod: string
  applicants: number
  newApplicants: number
  status: '모집중' | '마감임박' | '마감'
  maxCapacity: number
  price: number
}

export interface Applicant {
  id: number
  applicationId: string
  name: string
  age: number
  phone: string
  appliedDate: string
  scheduledDate: string | null
  consultationStatus: Application['status']
  enrollmentStatus: Application['enrollment_status']
  isAdditionalCourse: boolean
  isBlacklisted: boolean
  blacklistReason: string | null
}

export interface CourseMetricBreakdown {
  courseId: number
  name: string
  applications: number
  registrations: number
  consultations: number
  pending: number
  revenue: number
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '기간 미정'
  const fmt = (d: string) => d.replace(/-/g, '.')
  if (!start) return `~ ${fmt(end!)}`
  if (!end) return `${fmt(start)} ~`
  return `${fmt(start)} ~ ${fmt(end)}`
}

const CATEGORY_LABELS: Record<string, string> = {
  computer: '컴퓨터',
  figma: '디자인',
  tax: '세무',
  video: '영상',
}

type StatsPeriod = Pick<AdminStats['period'], 'start' | 'end_exclusive'>

export function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function computeCourseStatus(count: number, capacity: number): Course['status'] {
  const rate = capacity > 0 ? count / capacity : 0
  if (rate >= 1) return '마감'
  if (rate >= 0.9) return '마감임박'
  return '모집중'
}

function periodBoundaryTime(value: string): number {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value
  return new Date(normalized).getTime()
}

function extractHour(value: string): number {
  const match = value.match(/T(\d{2}):/)
  return match ? Number(match[1]) : Number.NaN
}

function isRegisteredInPeriod(application: Application, period: StatsPeriod): boolean {
  return isDateInPeriod(application.registered_at, period)
}

function isDateInPeriod(value: string | null, period: StatsPeriod): boolean {
  if (!value) return false
  const dateTime = new Date(value).getTime()
  const start = periodBoundaryTime(period.start)
  const end = periodBoundaryTime(period.end_exclusive)
  if (!Number.isFinite(dateTime) || !Number.isFinite(start) || !Number.isFinite(end)) return false
  return dateTime >= start && dateTime < end
}

export function calculateCurrentCourseRevenue(
  applications: Application[],
  configs: CourseConfig[],
  period?: StatsPeriod
): number {
  const coursesById = new Map(configs.map((course) => [course.id, course]))

  return applications.reduce((total, application) => {
    if (application.enrollment_status !== '등록') return total
    if (period && !isRegisteredInPeriod(application, period)) return total

    const currentPrice =
      coursesById.get(application.course_id)?.price ??
      application.courses.price ??
      application.registered_price ??
      0

    return total + currentPrice
  }, 0)
}

export function applyCurrentCourseRevenue(
  stats: AdminStats | null,
  applications: Application[],
  configs: CourseConfig[]
): AdminStats | null {
  if (!stats) return null

  return {
    ...stats,
    summary: {
      ...stats.summary,
      revenue: calculateCurrentCourseRevenue(applications, configs, stats.period),
    },
  }
}

export function buildCourseMetricBreakdown(
  applications: Application[],
  configs: CourseConfig[],
  period: StatsPeriod
): CourseMetricBreakdown[] {
  const coursesById = new Map(configs.map((course) => [course.id, course]))
  const rowsById = new Map<number, CourseMetricBreakdown>()

  const getRow = (application: Application): CourseMetricBreakdown => {
    const course = coursesById.get(application.course_id)
    const existing = rowsById.get(application.course_id)
    if (existing) return existing

    const row: CourseMetricBreakdown = {
      courseId: application.course_id,
      name: course?.name ?? application.courses.name,
      applications: 0,
      registrations: 0,
      consultations: 0,
      pending: 0,
      revenue: 0,
    }
    rowsById.set(application.course_id, row)
    return row
  }

  for (const application of applications) {
    const row = getRow(application)

    if (isDateInPeriod(application.created_at, period)) {
      row.applications += 1
    }

    if (application.status === '접수') {
      row.pending += 1
    }

    if (application.status !== '접수' && isDateInPeriod(application.scheduled_date ?? application.created_at, period)) {
      row.consultations += 1
    }

    if (application.enrollment_status === '등록' && isRegisteredInPeriod(application, period)) {
      row.registrations += 1
      row.revenue +=
        coursesById.get(application.course_id)?.price ??
        application.courses.price ??
        application.registered_price ??
        0
    }
  }

  return Array.from(rowsById.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function buildConsultationDailyMetricBreakdown(
  daily: AdminStats['consultation_daily']
): CourseMetricBreakdown[] {
  return daily.map((row, index) => ({
    courseId: -(index + 1),
    name: row.date,
    applications: 0,
    registrations: 0,
    consultations: row.count,
    pending: 0,
    revenue: 0,
  }))
}

export function buildConsultationHourlyMetricBreakdown(
  hourly: NonNullable<AdminStats['consultation_hourly']>
): CourseMetricBreakdown[] {
  return hourly.map((row, index) => ({
    courseId: -(1000 + index),
    name: row.hour,
    applications: 0,
    registrations: 0,
    consultations: row.count,
    pending: 0,
    revenue: 0,
  }))
}

export function buildApplicationHourlyMetricBreakdown(
  applications: Application[],
  period: StatsPeriod
): CourseMetricBreakdown[] {
  const counts = Array.from({ length: 24 }, () => 0)

  for (const application of applications) {
    if (!isDateInPeriod(application.created_at, period)) continue
    const hour = extractHour(application.created_at)
    if (Number.isFinite(hour) && hour >= 0 && hour < 24) {
      counts[hour] += 1
    }
  }

  return counts
    .map((count, hour) => ({
      courseId: -(2000 + hour),
      name: `${String(hour).padStart(2, '0')}:00`,
      applications: 0,
      registrations: 0,
      consultations: count,
      pending: 0,
      revenue: 0,
    }))
    .filter((row) => row.consultations > 0)
}

export function toCourses(
  applications: Application[],
  configs: CourseConfig[],
  newApplicationIds: Set<string> = new Set()
): Course[] {
  return configs
    .filter((config) => config.is_active)
    .map((config) => {
      const courseApplications = applications.filter((a) => a.course_id === config.id)
      return {
        id: String(config.id),
        title: config.name,
        category: CATEGORY_LABELS[config.slug] ?? config.name,
        trainingPeriod: formatPeriod(config.training_start, config.training_end),
        applicants: courseApplications.length,
        newApplicants: courseApplications.filter((a) => newApplicationIds.has(a.id)).length,
        status: computeCourseStatus(courseApplications.length, config.capacity),
        maxCapacity: config.capacity,
        price: config.price,
      }
    })
}

export function toApplicants(
  applications: Application[],
  allApplications: Application[] = applications
): Applicant[] {
  const registeredCoursesByPhone = new Map<string, Set<number>>()
  for (const application of allApplications) {
    if (application.enrollment_status !== '등록') continue
    const courseIds = registeredCoursesByPhone.get(application.phone) ?? new Set<number>()
    courseIds.add(application.course_id)
    registeredCoursesByPhone.set(application.phone, courseIds)
  }

  return applications.map((application, index) => ({
    id: index + 1,
    applicationId: application.id,
    name: application.name,
    age: calcAge(application.birth_date),
    phone: application.phone,
    appliedDate: application.created_at.split('T')[0],
    scheduledDate: application.scheduled_date,
    consultationStatus: application.status,
    enrollmentStatus: application.enrollment_status,
    isAdditionalCourse: (registeredCoursesByPhone.get(application.phone)?.size ?? 0) > 1,
    isBlacklisted: application.is_blacklisted,
    blacklistReason: application.blacklist_reason,
  }))
}
