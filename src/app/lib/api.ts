import type { GetApplicationsResponse, GetLogsResponse } from './types'

interface ApiError extends Error {
  status: number
}

function getBase(): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL이 설정되지 않았습니다')
  return `${url}/functions/v1`
}

function getAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
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
    const err = new Error(
      (data as { error?: string }).error ?? '오류가 발생했습니다'
    ) as ApiError
    err.status = res.status
    throw err
  }
  return data as T
}

export const login = (password: string) =>
  callEdge<{ token: string }>('/admin-login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const logout = (token: string) =>
  callEdge<{ ok: boolean }>('/admin-logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

export const refreshToken = (token: string) =>
  callEdge<{ token: string }>('/admin-refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

export const getApplications = (token: string, courseId?: number): Promise<GetApplicationsResponse> => {
  const qs = courseId != null ? `?course_id=${courseId}` : ''
  return callEdge<GetApplicationsResponse>(`/admin${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const updateApplication = (
  token: string,
  body: { id: string; status?: string; memo?: string; kakao_link?: string }
) =>
  callEdge<{ ok: boolean }>('/admin', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

export const getLogs = (
  token: string,
  params: { event_type?: string; date_from?: string; limit?: number; offset?: number } = {}
): Promise<GetLogsResponse> => {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString()
  return callEdge<GetLogsResponse>(`/admin-logs${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
