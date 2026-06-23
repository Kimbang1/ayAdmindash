import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('static security checks', () => {
  it('does not hardcode the admin password in the verification script', () => {
    const script = readFileSync(path.join(process.cwd(), 'verify-badges.mjs'), 'utf8')

    expect(script).toContain('process.env.ADMIN_PASSWORD')
    expect(script).not.toMatch(/const\s+PASSWORD\s*=\s*['"][^'"]+['"]/)
  })
})
