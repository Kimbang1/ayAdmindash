export interface Application {
  id: string
  created_at: string
  course_id: number
  name: string
  birth_date: string
  gender: '남' | '여'
  phone: string
  address: string
  military: string | null
  has_training_card: boolean
  national_employment: boolean
  employment_hours: string
  motivation: string | null
  status: '접수' | '상담예정' | '상담완료'
  enrollment_status: '미등록' | '등록' | '취소'
  registered_at: string | null
  registered_price: number | null
  memo: string | null
  kakao_link: string | null
  scheduled_date: string | null
  is_blacklisted: boolean
  blacklist_reason: string | null
  enrollment_date: string | null
  courses: {
    id?: number
    slug?: string
    name: string
    capacity?: number
    price?: number
  }
}

export interface CourseConfig {
  id: number
  slug: string
  name: string
  recruitment_start: string | null
  recruitment_end: string | null
  training_start: string | null
  training_end: string | null
  capacity: number
  price: number
  instructor: string | null
  location: string | null
  is_active: boolean
}

export interface AdminStats {
  period: { month: string; start: string; end_exclusive: string }
  generated_at: string
  timezone: 'Asia/Seoul'
  summary: {
    applications: number
    registrations: number
    revenue: number
    consultations: number
  }
  consultation_statuses: Record<Application['status'], number>
  enrollment_statuses: Record<Application['enrollment_status'], number>
  consultation_daily: Array<{ date: string; count: number }>
  age_distribution: Array<{ label: string; count: number }>
  courses: Array<{
    course_id: number
    name: string
    applications: number
    registered: number
    registration_rate: number
    average_age: number | null
  }>
}

export interface SecurityLog {
  id: string
  created_at: string
  event_type: string
  result: string
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown> | null
}

export interface ConsultationLog {
  id: string
  application_id: string
  content: string
  consultation_date: string
  created_at: string
}

export interface CallbackLog {
  id: string
  application_id: string
  callback_date: string
  memo: string
  created_at: string
}

export interface GetApplicationsResponse {
  applications: Application[]
}

export type ApplicationSaveFields = Partial<
  Pick<
    Application,
    'status' | 'enrollment_status' | 'scheduled_date' | 'enrollment_date' | 'is_blacklisted' | 'blacklist_reason'
  >
> & {
  kakao_link?: string
}

export interface GetLogsResponse {
  logs: SecurityLog[]
  total: number
  limit: number
  offset: number
}
