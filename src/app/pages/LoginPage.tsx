import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { Lock } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="flex w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden min-h-[520px]">
        {/* Left Panel */}
        <div className="hidden md:flex w-[45%] bg-slate-800 flex-col justify-center items-center gap-6 p-12">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="하이미디어 안양 로고" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-white text-2xl font-bold">하이미디어 안양</span>
          </div>
          <div className="border-t border-slate-600 w-16" />
          <p className="text-slate-300 text-lg">관리자 DashBoard</p>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            관리자 전용 접근 시스템입니다.
          </p>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white flex flex-col justify-center items-center p-8 md:p-16">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold text-slate-800 mb-8">관리자 로그인</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm text-slate-500 mb-2">비밀번호</label>
              <div className="flex items-center gap-2 border-b border-slate-300 focus-within:border-blue-500 pb-2 transition-colors">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="flex-1 outline-none text-sm placeholder:text-slate-300"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
