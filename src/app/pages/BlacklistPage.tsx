import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, ShieldX, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { LoadError } from '../components/LoadError'
import { useAuth } from '../lib/auth'
import { getBlacklistedApplications } from '../lib/api'
import { calcAge } from '../lib/transform'
import { PAGE_HEADERS } from '../lib/design'
import type { Application } from '../lib/types'

const DETAIL_WINDOW_FEATURES = 'width=1120,height=600'

function matchesSearch(app: Application, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    app.name,
    app.phone,
    app.courses?.name,
    app.blacklist_reason ?? '',
    app.memo ?? '',
    app.address,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

export function BlacklistPage() {
  const { token } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await getBlacklistedApplications(token)
      setApplications(res.applications)
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? '블랙리스트를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const filteredApplications = useMemo(
    () => applications.filter((app) => matchesSearch(app, search)),
    [applications, search]
  )

  const openDetail = (app: Application) => {
    window.open(`/course/${app.course_id}/applicants/${app.id}`, '_blank', DETAIL_WINDOW_FEATURES)
  }

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r ${PAGE_HEADERS.blacklist} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldX className="h-6 w-6" />
          <div>
            <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
            <h1 className="text-white text-2xl">블랙리스트</h1>
            <p className="text-slate-300 text-sm">블랙리스트 신청자를 검색하고 상세 기록을 바로 확인합니다.</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-xl p-3 inline-flex items-center gap-3">
          <div>
            <span className="text-2xl font-bold">{applications.length}</span>
            <span className="text-slate-300 text-sm ml-2">명 등록</span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <span className="text-2xl font-bold">{filteredApplications.length}</span>
            <span className="text-slate-300 text-sm ml-2">검색 결과</span>
          </div>
        </div>
      </div>

      {error && <LoadError message={error} onRetry={load} />}

      <Card>
        <CardHeader className="border-b bg-gray-50 rounded-t-xl">
          <CardTitle className="text-base text-gray-700">블랙리스트 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이름, 전화번호, 강좌명, 사유로 검색"
                  className="pl-9"
                />
              </div>
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="gap-1 text-gray-500">
                  <X className="h-4 w-4" />
                  초기화
                </Button>
              )}
            </div>
          </div>

          {loading && applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">불러오는 중...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              {search ? '검색 조건에 맞는 블랙리스트가 없습니다.' : '블랙리스트 신청자가 없습니다.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['이름', '나이', '연락처', '강좌', '등록일', '사유', ''].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, i) => (
                    <tr key={app.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {app.name}
                          <span className="rounded-full border border-red-200 bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">
                            블랙
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{calcAge(app.birth_date)}세</td>
                      <td className="px-4 py-3 text-gray-600">{app.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{app.courses?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{app.created_at.split('T')[0]}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs">
                        <span className="line-clamp-2">
                          {app.blacklist_reason || <span className="text-gray-300 italic">사유 없음</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(app)}
                          className="flex items-center gap-1 whitespace-nowrap text-xs text-blue-600 transition-colors hover:text-blue-800"
                        >
                          상세 <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
