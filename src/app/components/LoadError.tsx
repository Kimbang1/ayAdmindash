import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

interface LoadErrorProps {
  message: string
  onRetry: () => void
  stale?: boolean
}

export function LoadError({ message, onRetry, stale = false }: LoadErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle />
      <AlertTitle>{stale ? '최신 정보를 불러오지 못했습니다' : '정보를 불러오지 못했습니다'}</AlertTitle>
      <AlertDescription>
        <p>{message}{stale ? ' 최근에 불러온 데이터를 표시하고 있습니다.' : ''}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-4 w-4" />
          다시 불러오기
        </Button>
      </AlertDescription>
    </Alert>
  )
}

