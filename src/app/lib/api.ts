import type {
  AdminStats,
  Application,
  CallbackLog,
  ConsultationLog,
  CourseConfig,
  GetApplicationsResponse,
  GetLogsResponse,
  RevenueComparisonParams,
  RevenueComparisonResponse,
} from './types'
import { isMockMode } from './mockMode'
import {
  mockAddCallback,
  mockAddConsultation,
  mockCreateCourse,
  mockDeleteCallback,
  mockDeleteConsultation,
  mockDeleteCourse,
  mockGetAdminCourses,
  mockGetAdminStats,
  mockGetApplications,
  mockGetBlacklistedApplications,
  mockGetCallbacks,
  mockGetConsultations,
  mockGetLogs,
  mockGetRevenueComparison,
  mockLogin,
  mockLogout,
  mockRefresh,
  mockUpdateAdminCourse,
  mockUpdateApplication,
  mockUpdateConsultationDate,
} from './mockData'

interface ApiError extends Error {
  status: number
}

function getBase(): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL이 설정되지 않았습니다')
  return `${url}/functions/v1`
}

async function callEdge<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? '오류가 발생했습니다') as ApiError
    err.status = res.status
    throw err
  }
  return data as T
}

export const login = (password: string) =>
  isMockMode()
    ? mockLogin(password)
    : callEdge<{ token: string }>('/admin-login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })

export const logout = (token: string) =>
  isMockMode()
    ? mockLogout(token)
    : callEdge<{ ok: boolean }>('/admin-logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

export const refreshToken = (token: string) =>
  isMockMode()
    ? mockRefresh(token)
    : callEdge<{ token: string }>('/admin-refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

export const getApplications = (token: string, courseId?: number): Promise<GetApplicationsResponse> =>
  isMockMode()
    ? mockGetApplications(token, courseId)
    : callEdge<GetApplicationsResponse>(
        `/admin${courseId != null && Number.isFinite(courseId) ? `?${new URLSearchParams({ course_id: String(courseId) }).toString()}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

export const updateApplication = (
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
) =>
  isMockMode()
    ? mockUpdateApplication(token, body)
    : callEdge<{ ok: boolean; application: Application }>('/admin', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

export const getBlacklistedApplications = (token: string) =>
  isMockMode()
    ? mockGetBlacklistedApplications(token)
    : callEdge<{ applications: Application[] }>('/admin?is_blacklisted=true', {
        headers: { Authorization: `Bearer ${token}` },
      })

export const getAdminCourses = (token: string) =>
  isMockMode()
    ? mockGetAdminCourses(token)
    : callEdge<{ courses: CourseConfig[] }>('/admin-courses', {
        headers: { Authorization: `Bearer ${token}` },
      })

export const updateAdminCourse = (
  token: string,
  body: Pick<CourseConfig, 'id'> & Partial<Pick<CourseConfig, 'name' | 'recruitment_start' | 'recruitment_end' | 'training_start' | 'training_end' | 'capacity' | 'price' | 'instructor' | 'location' | 'is_active'>>
) =>
  isMockMode()
    ? mockUpdateAdminCourse(token, body)
    : callEdge<{ course: CourseConfig }>('/admin-courses', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

export const createCourse = (
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
) =>
  isMockMode()
    ? mockCreateCourse(token, body)
    : callEdge<{ course: CourseConfig }>('/admin-courses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

export const deleteCourse = (token: string, id: number) =>
  isMockMode()
    ? mockDeleteCourse(token, id)
    : callEdge<{ ok: boolean }>('/admin-courses', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })

export const getAdminStats = (token: string, month?: string) =>
  isMockMode()
    ? mockGetAdminStats(token, month)
    : callEdge<AdminStats>(`/admin-stats${month ? `?month=${encodeURIComponent(month)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

export const getConsultations = (token: string, applicationId: string): Promise<{ logs: ConsultationLog[] }> =>
  isMockMode()
    ? mockGetConsultations(token, applicationId)
    : callEdge<{ logs: ConsultationLog[] }>(
        `/admin-consultations?${new URLSearchParams({ application_id: applicationId }).toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

export const addConsultation = (
  token: string,
  applicationId: string,
  content: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> =>
  isMockMode()
    ? mockAddConsultation(token, applicationId, content, consultationDate)
    : callEdge<{ log: ConsultationLog }>('/admin-consultations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          application_id: applicationId,
          content,
          consultation_date: consultationDate,
        }),
      })

export const updateConsultationDate = (
  token: string,
  logId: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> =>
  isMockMode()
    ? mockUpdateConsultationDate(token, logId, consultationDate)
    : callEdge<{ log: ConsultationLog }>('/admin-consultations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: logId, consultation_date: consultationDate }),
      })

export const deleteConsultation = (token: string, logId: string) =>
  isMockMode()
    ? mockDeleteConsultation(token, logId)
    : callEdge<{ ok: boolean }>('/admin-consultations', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: logId }),
      })

export const getCallbacks = (token: string, applicationId: string): Promise<{ logs: CallbackLog[] }> =>
  isMockMode()
    ? mockGetCallbacks(token, applicationId)
    : callEdge<{ logs: CallbackLog[] }>(
        `/admin-callbacks?${new URLSearchParams({ application_id: applicationId }).toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

export const addCallback = (
  token: string,
  applicationId: string,
  callbackDate: string,
  memo: string
): Promise<{ log: CallbackLog }> =>
  isMockMode()
    ? mockAddCallback(token, applicationId, callbackDate, memo)
    : callEdge<{ log: CallbackLog }>('/admin-callbacks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          application_id: applicationId,
          callback_date: callbackDate,
          memo,
        }),
      })

export const deleteCallback = (token: string, logId: string) =>
  isMockMode()
    ? mockDeleteCallback(token, logId)
    : callEdge<{ ok: boolean }>('/admin-callbacks', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: logId }),
      })

export const getLogs = (
  token: string,
  params: { event_type?: string; date_from?: string; limit?: number; offset?: number } = {}
): Promise<GetLogsResponse> => {
  if (isMockMode()) return mockGetLogs(token, params)
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString()
  return callEdge<GetLogsResponse>(`/admin-logs${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const getRevenueComparison = (
  token: string,
  params: RevenueComparisonParams
): Promise<RevenueComparisonResponse> =>
  isMockMode()
    ? mockGetRevenueComparison(token, params)
    : callEdge<RevenueComparisonResponse>(
        `/admin-revenue-comparison?${new URLSearchParams({
          granularity: params.granularity,
          start: params.start,
          end: params.end,
        }).toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
