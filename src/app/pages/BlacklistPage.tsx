import { useEffect, useState } from "react"
import { ShieldX, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { LoadError } from "../components/LoadError"
import { useAuth } from "../lib/auth"
import { getBlacklistedApplications } from "../lib/api"
import { calcAge } from "../lib/transform"
import { PAGE_HEADERS } from "../lib/design"
import type { Application } from "../lib/types"

const DETAIL_WINDOW_FEATURES = "width=1120,height=900"

export function BlacklistPage() {
  const { token } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await getBlacklistedApplications(token)
      setApplications(res.applications)
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "블랙리스트를 불러오지 못했습니다")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const openDetail = (app: Application) => {
    window.open(
      `/course/${app.course_id}/applicants/${app.id}`,
      "_blank",
      DETAIL_WINDOW_FEATURES
    )
  }

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r ${PAGE_HEADERS.blacklist} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldX className="h-6 w-6" />
          <div>
            <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
            <h1 className="text-white text-2xl">블랙리스트</h1>
            <p className="text-slate-300 text-sm">전 강좌 블랙리스트 등록 신청자 목록입니다.</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-xl p-3 inline-block">
          <span className="text-2xl font-bold">{applications.length}</span>
          <span className="text-slate-300 text-sm ml-2">명 등록됨</span>
        </div>
      </div>

      {error && <LoadError message={error} onRetry={load} />}

      <Card>
        <CardHeader className="border-b bg-gray-50 rounded-t-xl">
          <CardTitle className="text-base text-gray-700">블랙리스트 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">불러오는 중...</div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              블랙리스트에 등록된 신청자가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["이름", "나이", "연락처", "강좌", "신청일", "사유", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{app.name}</td>
                      <td className="px-4 py-3 text-gray-600">{calcAge(app.birth_date)}세</td>
                      <td className="px-4 py-3 text-gray-600">{app.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{app.courses?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{app.created_at.split("T")[0]}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs">
                        <span className="line-clamp-2">
                          {app.blacklist_reason || <span className="text-gray-300 italic">사유 없음</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(app)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
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
