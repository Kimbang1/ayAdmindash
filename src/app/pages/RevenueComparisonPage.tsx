import { useState, useCallback, useEffect } from 'react'
import { Download, Search, TrendingUp, Users, ClipboardList, WalletCards } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LoadError } from '../components/LoadError'
import { useRevenueComparison } from '../lib/useRevenueComparison'
import { exportRevenueComparisonCsv } from '../lib/csvExport'
import type { RevenueGranularity, RevenueComparisonParams } from '../lib/types'

// --- 기간 입력 기본값 (현재 연도 기준) ---
const currentYear = new Date().getFullYear()
const DEFAULT_INPUTS: Record<RevenueGranularity, { start: string; end: string }> = {
  month: { start: `${currentYear}-01`, end: `${currentYear}-06` },
  quarter: { start: `${currentYear}-Q1`, end: `${currentYear}-Q2` },
  year: { start: String(currentYear - 1), end: String(currentYear) },
}

const GRANULARITY_LABELS: Record<RevenueGranularity, string> = {
  month: '월별',
  quarter: '분기별',
  year: '연별',
}

// --- 분기 선택 컴포넌트 ---
function QuarterInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [year, q] = value.includes('-') ? value.split('-') : [`${currentYear}`, 'Q1']
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="flex gap-1">
        <select
          className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
          value={year}
          onChange={(e) => onChange(`${e.target.value}-${q}`)}
        >
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select
          className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
          value={q}
          onChange={(e) => onChange(`${year}-${e.target.value}`)}
        >
          {['Q1', 'Q2', 'Q3', 'Q4'].map((qv) => (
            <option key={qv} value={qv}>{qv}분기</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// --- 연도 선택 컴포넌트 ---
function YearInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
    </div>
  )
}

export function RevenueComparisonPage() {
  const [granularity, setGranularity] = useState<RevenueGranularity>('month')
  const [startInput, setStartInput] = useState(DEFAULT_INPUTS.month.start)
  const [endInput, setEndInput] = useState(DEFAULT_INPUTS.month.end)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 30>(10)
  const { data, loading, error, fetch } = useRevenueComparison()

  const handleGranularityChange = useCallback((next: RevenueGranularity) => {
    setGranularity(next)
    setStartInput(DEFAULT_INPUTS[next].start)
    setEndInput(DEFAULT_INPUTS[next].end)
    setValidationError(null)
  }, [])

  const handleFetch = useCallback(() => {
    if (startInput > endInput) {
      setValidationError('시작 기간이 종료 기간보다 늦습니다.')
      return
    }
    setValidationError(null)
    fetch({ granularity, start: startInput, end: endInput })
  }, [granularity, startInput, endInput, fetch])

  const handleExport = useCallback(() => {
    if (!data?.details?.length) return
    const params: RevenueComparisonParams = { granularity, start: startInput, end: endInput }
    exportRevenueComparisonCsv(data.details, params)
  }, [data, granularity, startInput, endInput])

  useEffect(() => {
    setPage(1)
  }, [data])

  const summary = data
    ? {
        revenue: data.periods.reduce((s, p) => s + p.revenue, 0),
        registrations: data.periods.reduce((s, p) => s + p.registrations, 0),
        applications: data.periods.reduce((s, p) => s + p.applications, 0),
      }
    : null

  const totalPages = data ? Math.ceil(data.details.length / pageSize) : 0
  const pagedDetails = data
    ? data.details.slice((page - 1) * pageSize, page * pageSize)
    : []

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-600 rounded-2xl p-6 text-white">
        <p className="text-indigo-300 text-sm mb-1">비교 분석</p>
        <h1 className="text-white text-2xl mb-1">매출·등록 비교</h1>
        <p className="text-indigo-200 text-sm">기간별 매출과 등록 인원을 비교합니다</p>
      </div>

      {/* 필터 바 */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          {/* 단위 탭 */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
            {(['month', 'quarter', 'year'] as RevenueGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => handleGranularityChange(g)}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                  granularity === g
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>

          {/* 기간 입력 */}
          <div className="flex flex-wrap gap-3 items-end">
            {granularity === 'month' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">시작 월</label>
                  <input
                    type="month"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">종료 월</label>
                  <input
                    type="month"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm text-gray-700"
                  />
                </div>
              </>
            )}
            {granularity === 'quarter' && (
              <>
                <QuarterInput value={startInput} onChange={setStartInput} label="시작 분기" />
                <QuarterInput value={endInput} onChange={setEndInput} label="종료 분기" />
              </>
            )}
            {granularity === 'year' && (
              <>
                <YearInput value={startInput} onChange={setStartInput} label="시작 연도" />
                <YearInput value={endInput} onChange={setEndInput} label="종료 연도" />
              </>
            )}

            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
            >
              <Search className="h-4 w-4" />
              {loading ? '조회 중...' : '조회'}
            </button>

            <button
              onClick={handleExport}
              disabled={!data?.details?.length || loading}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV 내보내기
            </button>
          </div>

          {validationError && (
            <p className="mt-2 text-sm text-red-600">{validationError}</p>
          )}
        </CardContent>
      </Card>

      {/* 오류 표시 */}
      {error && <LoadError message={error} onRetry={handleFetch} />}

      {/* 요약 카드 */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: '총 매출', value: `${summary.revenue.toLocaleString()}원`, icon: WalletCards, color: 'text-violet-600', bg: 'bg-violet-100' },
            { label: '총 등록인원', value: `${summary.registrations}명`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: '총 신청수', value: `${summary.applications}명`, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
          ].map((card) => (
            <Card key={card.label} className="border border-gray-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`${card.bg} p-3 rounded-xl`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">{card.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 비교 차트 */}
      {data && data.periods.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="border-b bg-gray-50 rounded-t-xl">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              기간별 비교 차트
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.periods} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  label={{ value: '인원(명)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                  label={{ value: '매출(만원)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === '매출' ? [`${value.toLocaleString()}원`, name] : [`${value}명`, name]
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="registrations" name="등록인원" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="applications" name="신청수" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 상세 테이블 */}
      {data && data.details.length > 0 && (
        <Card className="border border-gray-200">
          <div className="border-b bg-gray-50 rounded-t-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              상세 내역{' '}
              <span className="text-xs text-gray-400 font-normal">총 {data.details.length}건</span>
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">표시:</span>
              {([10, 20, 30] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => { setPageSize(size); setPage(1); }}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    pageSize === size
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">기간</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">강좌명</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">연령대</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">신청수</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">등록인원</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">총 매출</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDetails.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{row.period_label}</td>
                      <td className="px-4 py-3 text-gray-700">{row.course_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.age_band}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.applications}명</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{row.registrations}명</td>
                      <td className="px-4 py-3 text-right font-medium text-violet-700">{row.revenue.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.details.length)} / {data.details.length}건
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const pageNum = start + i
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 빈 데이터 */}
      {data && data.periods.length === 0 && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          해당 기간에 데이터가 없습니다.
        </div>
      )}

      {/* 생성 시각 */}
      {data && (
        <p className="text-xs text-right text-gray-400">
          생성 시각: {new Date(data.generated_at).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  )
}
