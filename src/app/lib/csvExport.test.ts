import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCsvString, escapeCsvCell, exportRevenueComparisonCsv } from './csvExport'
import type { RevenueComparisonDetail } from './types'

const detail: RevenueComparisonDetail = {
  period_key: '2026-01',
  period_label: '2026-01',
  course_id: 1,
  course_name: '프론트엔드 실무',
  age_band: '20대',
  applications: 10,
  registrations: 5,
  revenue: 500000,
}

describe('buildCsvString', () => {
  it('creates a CSV header and row data', () => {
    const csv = buildCsvString([detail])
    const lines = csv.split('\n')

    expect(lines[0]).toBe('기간,강좌명,연령대,신청,등록,매출(원)')
    expect(lines[1]).toBe('2026-01,프론트엔드 실무,20대,10,5,500000')
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

describe('exportRevenueComparisonCsv', () => {
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T10:00:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('groups rows by course and uses the requested filename format', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    exportRevenueComparisonCsv(
      [
        { ...detail, course_name: '프론트엔드 실무', period_label: '2026-01' },
        { ...detail, course_name: '데이터 분석 기초', period_label: '2026-02' },
      ],
      { granularity: 'month', start: '2026-01', end: '2026-02' }
    )

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(createElementSpy).toHaveBeenCalledWith('a')

    const anchor = createElementSpy.mock.results[0]?.value as HTMLAnchorElement | undefined
    expect(anchor?.download).toBe('260623_월별.csv')
  })
})
