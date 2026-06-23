import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getApplications, getCallbacks, getConsultations } from './api'

const BASE_URL = 'https://example.supabase.co'

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', BASE_URL)
  vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('api query construction', () => {
  it('encodes consultation application_id as a single query value', async () => {
    await getConsultations('token', 'app-1&limit=100')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/functions/v1/admin-consultations?application_id=app-1%26limit%3D100`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
  })

  it('encodes callback application_id as a single query value', async () => {
    await getCallbacks('token', 'app-1&offset=999')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/functions/v1/admin-callbacks?application_id=app-1%26offset%3D999`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
  })

  it('omits invalid course_id values instead of sending NaN', async () => {
    await getApplications('token', Number.NaN)

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/functions/v1/admin`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
  })
})
