import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildCsvString, escapeCsvCell } from './csvExport'
import type { RevenueComparisonDetail } from './types'

const detail: RevenueComparisonDetail = {
  period_key: '2026-01',
  period_label: '2026년 1월',
  course_id: 1,
  course_name: '컴퓨터 활용',
  age_band: '50대',
  applications: 10,
  registrations: 5,
  revenue: 500000,
}

describe('buildCsvString', () => {
  it('헤더 행이 올바른 순서로 생성된다', () => {
    const csv = buildCsvString([detail])
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('기간,강좌명,연령대,신청수,등록인원,총 매출(원)')
  })

  it('데이터 행이 올바르게 생성된다', () => {
    const csv = buildCsvString([detail])
    const secondLine = csv.split('\n')[1]
    expect(secondLine).toBe('2026년 1월,컴퓨터 활용,50대,10,5,500000')
  })

  it('쉼표 포함 값은 따옴표로 감싼다', () => {
    const csv = buildCsvString([{ ...detail, course_name: '컴퓨터, 엑셀' }])
    expect(csv).toContain('"컴퓨터, 엑셀"')
  })

  it('빈 배열은 헤더만 반환한다', () => {
    const csv = buildCsvString([])
    expect(csv.split('\n')).toHaveLength(1)
  })

  it('BOM 포함 확인 (UTF-8 BOM은 exportRevenueComparisonCsv에서 추가)', () => {
    // buildCsvString 자체는 BOM 없이 순수 CSV 문자열 반환
    const csv = buildCsvString([detail])
    expect(csv.startsWith('﻿')).toBe(false)
    expect(csv.startsWith('기간')).toBe(true)
  })

  it('escapes leading formula characters for spreadsheet exports', () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.com")')).toBe(
      '"\'=HYPERLINK(""https://example.com"")"'
    )
    expect(escapeCsvCell('+SUM(1,1)')).toBe('"\'+SUM(1,1)"')
    expect(escapeCsvCell('@cmd')).toBe("'@cmd")
  })

  it('prevents formula injection when building CSV rows', () => {
    const csv = buildCsvString([
      { ...detail, course_name: '=IMPORTXML("https://example.com","//a")' },
    ])
    expect(csv).toContain('"\'=IMPORTXML(""https://example.com"",""//a"")"')
  })
})
