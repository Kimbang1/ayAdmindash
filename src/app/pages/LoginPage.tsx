import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const pw = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
    setLoading(true)
    setError('')
    try {
      await login(pw)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const errorValue = err as { status?: number; message?: string }
      if (errorValue.status === 401) setError('관리자 비밀번호가 올바르지 않습니다.')
      else setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm">
        <div className="bg-slate-800 rounded-xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <h1 className="text-white text-xl font-semibold">하이미디어 안양</h1>
          </div>
          <p className="text-slate-400 text-sm">관리자 시스템</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="관리자 비밀번호 입력"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
