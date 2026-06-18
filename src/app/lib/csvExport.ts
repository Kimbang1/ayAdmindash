import type { RevenueComparisonDetail, RevenueComparisonParams } from './types'

function escapeCsv(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsvString(details: RevenueComparisonDetail[]): string {
  const headers = ['기간', '강좌명', '연령대', '신청수', '등록인원', '총 매출(원)']
  const rows = details.map((row) => [
    row.period_label,
    row.course_name,
    row.age_band,
    row.applications,
    row.registrations,
    row.revenue,
  ])
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
}

export function exportRevenueComparisonCsv(
  details: RevenueComparisonDetail[],
  params: RevenueComparisonParams
): void {
  const bom = '﻿'
  const blob = new Blob([bom + buildCsvString(details)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `revenue-comparison-${params.granularity}-${params.start}-${params.end}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
