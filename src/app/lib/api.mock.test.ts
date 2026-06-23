import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminStats, getApplications, getConsultations, getRevenueComparison, login } from './api'

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mock api mode', () => {
  it('returns a token on login', async () => {
    await expect(login('test-password')).resolves.toEqual({ token: 'mock-admin-token' })
  })

  it('returns seeded application and consultation data', async () => {
    const applications = await getApplications('mock-admin-token')
    expect(applications.applications.length).toBeGreaterThan(0)

    const consultations = await getConsultations('mock-admin-token', 'app-1002')
    expect(consultations.logs.length).toBe(2)
  })

  it('returns coherent stats', async () => {
    const stats = await getAdminStats('mock-admin-token', '2026-06')
    expect(stats.summary.applications).toBeGreaterThan(0)
    expect(stats.summary.consultations).toBeGreaterThan(0)
    expect(stats.consultation_daily.reduce((sum, row) => sum + row.count, 0)).toBe(stats.summary.consultations)
  })

  it('spans multiple periods for yearly and quarterly comparison views', async () => {
    const monthly = await getRevenueComparison('mock-admin-token', {
      granularity: 'month',
      start: '2024-01',
      end: '2026-06',
    })

    expect(monthly.periods.length).toBeGreaterThan(12)
    expect(monthly.details.length).toBeGreaterThan(10)
    expect(new Set(monthly.details.map((row) => row.age_band)).size).toBeGreaterThanOrEqual(4)

    const quarterly = await getRevenueComparison('mock-admin-token', {
      granularity: 'quarter',
      start: '2024-Q1',
      end: '2026-Q2',
    })

    expect(quarterly.periods.length).toBeGreaterThanOrEqual(8)
    expect(quarterly.details.some((row) => row.revenue > 0)).toBe(true)
  })
})
