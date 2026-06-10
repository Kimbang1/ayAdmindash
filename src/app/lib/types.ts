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
  national_employment: boolean
  employment_hours: string
  motivation: string | null
  status: '접수' | '상담예정' | '상담완료'
  memo: string | null
  kakao_link: string | null
  scheduled_date: string | null
  courses: { name: string }
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
  created_at: string
}

export interface GetApplicationsResponse {
  applications: Application[]
}

export interface GetLogsResponse {
  logs: SecurityLog[]
  total: number
  limit: number
  offset: number
}
