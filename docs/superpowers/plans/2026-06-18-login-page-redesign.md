# Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `LoginPage` from a centered card to a Brickshare-style split-screen layout while keeping all authentication logic unchanged.

**Architecture:** Single-file visual rewrite of `src/app/pages/LoginPage.tsx`. Left panel (slate-800) shows brand info; right panel (white) holds the existing password form. Logic, routing, and auth are not touched.

**Tech Stack:** React, Tailwind CSS, lucide-react, Vitest + @testing-library/react

## Global Constraints

- Authentication logic (`handleSubmit`, `useAuth`, error messages) must remain byte-for-byte identical
- `lucide-react` is already installed — use `Lock` icon
- Test runner: `npm test` (vitest run)
- Build check: `npm run build`
- Left panel hidden on `< md` breakpoint (Tailwind `hidden md:flex`)

---

### Task 1: Redesign LoginPage with split-screen layout (TDD)

**Files:**
- Modify: `src/app/pages/LoginPage.tsx`
- Create: `src/app/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `../lib/auth` (unchanged), `useNavigate` from `react-router`
- Produces: `LoginPage` component (same export name, same props — none)

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/LoginPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockLogin = vi.fn()
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ token: null, login: mockLogin, logout: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renders left panel branding', () => {
    render(<LoginPage />)
    expect(screen.getByText('하이미디어 안양')).toBeInTheDocument()
    expect(screen.getByText('관리자 DashBoard')).toBeInTheDocument()
  })

  it('renders password input and login button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('비밀번호를 입력하세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('shows 401 error message on wrong password', async () => {
    mockLogin.mockRejectedValue({ status: 401 })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() =>
      expect(screen.getByText('관리자 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
    )
  })

  it('shows network error message on server failure', async () => {
    mockLogin.mockRejectedValue({ status: 500 })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
      target: { value: 'pw' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() =>
      expect(
        screen.getByText('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.')
      ).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test -- LoginPage
```

Expected: FAIL — `하이미디어 안양` and `관리자 DashBoard` not found (old layout lacks these in separate elements), `비밀번호를 입력하세요` placeholder not found.

- [ ] **Step 3: Implement the redesigned LoginPage.tsx**

Replace the entire content of `src/app/pages/LoginPage.tsx`:

```tsx
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
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden md:flex w-[45%] bg-slate-800 flex-col justify-center items-center gap-6 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
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
              <label className="block text-sm text-slate-500 mb-2">비밀번호</label>
              <div className="flex items-center gap-2 border-b border-slate-300 focus-within:border-blue-500 pb-2 transition-colors">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
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
  )
}
```

- [ ] **Step 4: Run test — verify it PASSES**

```bash
npm test -- LoginPage
```

Expected: 5/5 PASS

- [ ] **Step 5: Run full test suite and build**

```bash
npm test
npm run build
```

Expected: all existing tests pass, build exits 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/LoginPage.tsx src/app/pages/LoginPage.test.tsx
git commit -m "feat: redesign login page with split-screen layout (Brickshare style)"
```

---

### Task 2: Claude Design preview via DesignSync

**Files:**
- Create: `docs/design-preview/login-page-preview.html`

**Interfaces:**
- Consumes: design spec in `docs/superpowers/specs/2026-06-18-login-page-redesign-design.md`
- Produces: Claude Design card published to the project's design system

- [ ] **Step 1: Create the HTML preview file**

Create `docs/design-preview/login-page-preview.html`:

```html
<!-- @dsCard group="Auth" -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login Page Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen flex" style="height:600px">
    <!-- Left Panel -->
    <div class="flex w-[45%] bg-slate-800 flex-col justify-center items-center gap-6 p-12">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
          <span class="text-white text-lg font-bold">A</span>
        </div>
        <span class="text-white text-2xl font-bold">하이미디어 안양</span>
      </div>
      <div class="border-t border-slate-600 w-16"></div>
      <p class="text-slate-300 text-lg">관리자 DashBoard</p>
      <p class="text-slate-400 text-sm text-center max-w-xs">관리자 전용 접근 시스템입니다.</p>
    </div>

    <!-- Right Panel -->
    <div class="flex-1 bg-white flex flex-col justify-center items-center p-16">
      <div class="w-full max-w-sm">
        <h1 class="text-2xl font-semibold text-slate-800 mb-8">관리자 로그인</h1>
        <div class="space-y-6">
          <div>
            <label class="block text-sm text-slate-500 mb-2">비밀번호</label>
            <div class="flex items-center gap-2 border-b border-slate-300 pb-2">
              <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                class="flex-1 outline-none text-sm placeholder:text-slate-300"
              />
            </div>
          </div>
          <button class="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            로그인
          </button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Use DesignSync to publish preview**

Use the `DesignSync` tool (available in this Claude Code session) to:
1. `list_projects` — find or confirm target design system project
2. `finalize_plan` — declare `docs/design-preview/login-page-preview.html` as a write
3. `write_files` — upload the file using `localPath`
4. `register_assets` — register a card named "Login Page" in group "Auth"

- [ ] **Step 3: Commit**

```bash
git add docs/design-preview/login-page-preview.html
git commit -m "docs: add login page Claude Design preview"
```
