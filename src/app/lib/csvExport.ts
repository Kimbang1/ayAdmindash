import type { RevenueComparisonDetail, RevenueComparisonParams } from './types'

const CSV_FORMULA_PREFIX = /^[\t\r\n]|^\s*[=+\-@]/

const GRANULARITY_LABELS: Record<RevenueComparisonParams['granularity'], string> = {
  month: '월별',
  quarter: '분기별',
  year: '연별',
}

export function escapeCsvCell(value: string | number): string {
  const str = String(value)
  const safe = typeof value === 'string' && CSV_FORMULA_PREFIX.test(str) ? `'${str}` : str
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

function buildSectionRows(courseName: string, rows: RevenueComparisonDetail[]): Array<Array<string | number>> {
  return [
    ['강좌', courseName],
    ['기간', '강좌명', '연령대', '신청', '등록', '매출(원)'],
    ...rows.map((row) => [
      row.period_label,
      row.course_name,
      row.age_band,
      row.applications,
      row.registrations,
      row.revenue,
    ]),
  ]
}

export function buildCsvString(details: RevenueComparisonDetail[]): string {
  const headers = ['기간', '강좌명', '연령대', '신청', '등록', '매출(원)']
  const rows = details.map((row) => [
    row.period_label,
    row.course_name,
    row.age_band,
    row.applications,
    row.registrations,
    row.revenue,
  ])
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

function buildSectionedCsvString(details: RevenueComparisonDetail[]): string {
  const grouped = new Map<string, RevenueComparisonDetail[]>()
  for (const detail of details) {
    const rows = grouped.get(detail.course_name) ?? []
    rows.push(detail)
    grouped.set(detail.course_name, rows)
  }

  const sections: string[] = []
  for (const [courseName, rows] of grouped.entries()) {
    sections.push(
      buildSectionRows(courseName, rows)
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\n')
    )
  }

  return sections.join('\n\n')
}

function getExportDateKey(): string {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  return today.replace(/-/g, '').slice(2)
}

export function exportRevenueComparisonCsv(
  details: RevenueComparisonDetail[],
  params: RevenueComparisonParams
): void {
  const bom = '\uFEFF'
  const csv = buildSectionedCsvString(details)
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${getExportDateKey()}_${GRANULARITY_LABELS[params.granularity]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
