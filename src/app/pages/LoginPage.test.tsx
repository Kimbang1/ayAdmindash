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
