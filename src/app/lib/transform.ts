import type { Application, CourseConfig } from './types'

export interface Course {
  id: string
  title: string
  category: string
  duration: string
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
}

const CATEGORY_LABELS: Record<string, string> = {
  computer: '컴퓨터',
  figma: '디자인',
  tax: '세무',
  video: '영상',
}

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

export function toCourses(
  applications: Application[],
  configs: CourseConfig[],
  newApplicationIds: Set<string> = new Set()
): Course[] {
  return configs.map((config) => {
    const courseApplications = applications.filter((application) => application.course_id === config.id)
    return {
      id: String(config.id),
      title: config.name,
      category: CATEGORY_LABELS[config.slug] ?? config.name,
      duration: config.duration,
      applicants: courseApplications.length,
      newApplicants: courseApplications.filter((application) => newApplicationIds.has(application.id)).length,
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
  }))
}
