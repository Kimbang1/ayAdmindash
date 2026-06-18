import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Hoisted mocks that can be modified during tests
const { mockLogout, getAuthState, setAuthToken } = vi.hoisted(() => {
  const mockLogout = vi.fn()
  let authToken: string | null = 'test-token'
  return {
    mockLogout,
    getAuthState: () => ({ token: authToken, logout: mockLogout }),
    setAuthToken: (token: string | null) => {
      authToken = token
    },
  }
})

// api mock
const mockGetRevenueComparison = vi.fn()
vi.mock('./api', () => ({
  getRevenueComparison: (...args: unknown[]) => mockGetRevenueComparison(...args),
}))

// auth mock with logout spy
vi.mock('./auth', () => ({
  useAuth: () => getAuthState(),
}))

// Import after mocks are set up
const { useRevenueComparison } = await import('./useRevenueComparison')

const mockResponse = {
  periods: [{ period_key: '2026-01', period_label: '2026년 1월', applications: 5, registrations: 3, revenue: 300000 }],
  details: [],
  generated_at: '2026-06-18T00:00:00Z',
  timezone: 'Asia/Seoul' as const,
}

describe('useRevenueComparison', () => {
  beforeEach(() => {
    mockGetRevenueComparison.mockReset()
    mockLogout.mockReset()
  })

  it('초기 상태: data null, loading false, error null', () => {
    const { result } = renderHook(() => useRevenueComparison())
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetch 호출 시 loading이 true였다가 data 설정', async () => {
    mockGetRevenueComparison.mockResolvedValueOnce(mockResponse)
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    expect(mockGetRevenueComparison).toHaveBeenCalledWith('test-token', {
      granularity: 'month',
      start: '2026-01',
      end: '2026-06',
    })
    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('API 오류 시 error 설정, data 유지 안 함', async () => {
    mockGetRevenueComparison.mockRejectedValueOnce({ message: '서버 오류', status: 500 })
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    expect(result.current.error).toBe('서버 오류')
    expect(result.current.data).toBeNull()
  })

  it('401 오류 시 logout 호출', async () => {
    mockGetRevenueComparison.mockRejectedValueOnce({ message: '인증 오류', status: 401 })
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    // logout이 실제로 호출됨
    expect(mockLogout).toHaveBeenCalled()
    // 401 오류는 error로 설정되지 않아야 함
    expect(result.current.error).toBeNull()
  })

  it('token이 없으면 fetch 호출 시 API 호출 없음', async () => {
    // token을 null로 설정
    setAuthToken(null)
    const { result } = renderHook(() => useRevenueComparison())

    mockGetRevenueComparison.mockClear()

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    // API가 호출되지 않아야 함
    expect(mockGetRevenueComparison).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()

    // 다음 테스트를 위해 token 복구
    setAuthToken('test-token')
  })
})
