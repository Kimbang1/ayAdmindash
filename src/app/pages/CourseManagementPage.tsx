import { useState } from "react"
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { LoadError } from "../components/LoadError"
import { useCourses } from "../lib/useCourses"
import { useAuth } from "../lib/auth"
import { createCourse, deleteCourse, updateAdminCourse } from "../lib/api"
import type { CourseConfig } from "../lib/types"
import { toast } from "sonner"

const EMPTY_FORM = {
  name: "",
  recruitment_start: "",
  recruitment_end: "",
  training_start: "",
  training_end: "",
  capacity: "",
  price: "",
  instructor: "",
  location: "",
}

function validateForm(form: typeof EMPTY_FORM): string | null {
  if (!form.name.trim()) return "강좌명을 입력해주세요"
  if (form.recruitment_start && form.recruitment_end && form.recruitment_end < form.recruitment_start)
    return "모집 종료일이 시작일보다 빠릅니다"
  if (!form.training_start) return "교육 시작일을 선택해주세요"
  if (!form.training_end) return "교육 종료일을 선택해주세요"
  if (form.training_end < form.training_start) return "교육 종료일이 시작일보다 빠릅니다"
  if (!form.capacity || Number(form.capacity) <= 0) return "정원은 1명 이상이어야 합니다"
  if (form.price === "" || Number(form.price) < 0) return "수강료를 입력해주세요"
  return null
}

export function CourseManagementPage() {
  const { token } = useAuth()
  const coursesQuery = useCourses()
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseConfig | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const closeForm = () => {
    setShowForm(false)
    setEditingCourse(null)
    setForm(EMPTY_FORM)
  }

  const handleEdit = (course: CourseConfig) => {
    setForm({
      name: course.name,
      recruitment_start: course.recruitment_start ?? "",
      recruitment_end: course.recruitment_end ?? "",
      training_start: course.training_start ?? "",
      training_end: course.training_end ?? "",
      capacity: String(course.capacity),
      price: String(course.price),
      instructor: course.instructor ?? "",
      location: course.location ?? "",
    })
    setEditingCourse(course)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm(form)
    if (validationError) { toast.error(validationError); return }
    if (!token) return
    setSubmitting(true)
    try {
      if (editingCourse) {
        const response = await updateAdminCourse(token, {
          id: editingCourse.id,
          name: form.name.trim(),
          recruitment_start: form.recruitment_start || null,
          recruitment_end: form.recruitment_end || null,
          training_start: form.training_start,
          training_end: form.training_end,
          capacity: Number(form.capacity),
          price: Number(form.price),
          instructor: form.instructor.trim() || null,
          location: form.location.trim() || null,
        })
        coursesQuery.setCourses((prev) =>
          prev.map((c) => (c.id === response.course.id ? response.course : c))
        )
        closeForm()
        toast.success(`${response.course.name} 강좌가 수정되었습니다`)
      } else {
        const response = await createCourse(token, {
          name: form.name.trim(),
          recruitment_start: form.recruitment_start || undefined,
          recruitment_end: form.recruitment_end || undefined,
          training_start: form.training_start,
          training_end: form.training_end,
          capacity: Number(form.capacity),
          price: Number(form.price),
          instructor: form.instructor.trim() || undefined,
          location: form.location.trim() || undefined,
        })
        coursesQuery.setCourses((prev) => [response.course, ...prev])
        closeForm()
        toast.success(`${response.course.name} 강좌가 등록되었습니다`)
      }
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? (editingCourse ? "수정에 실패했습니다" : "등록에 실패했습니다"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (course: CourseConfig) => {
    if (!token) return
    if (!confirm(`"${course.name}" 강좌를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setDeletingId(course.id)
    try {
      await deleteCourse(token, course.id)
      coursesQuery.setCourses((prev) => prev.filter((c) => c.id !== course.id))
      toast.success(`${course.name} 강좌가 삭제되었습니다`)
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "삭제에 실패했습니다")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (course: CourseConfig) => {
    if (!token) return
    setTogglingId(course.id)
    try {
      const response = await updateAdminCourse(token, { id: course.id, is_active: !course.is_active })
      coursesQuery.setCourses((prev) =>
        prev.map((c) => (c.id === response.course.id ? response.course : c))
      )
      toast.success(
        `${course.name} 강좌가 ${response.course.is_active ? "활성화" : "비활성화"}되었습니다`
      )
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "변경에 실패했습니다")
    } finally {
      setTogglingId(null)
    }
  }

  const fmt = (d: string | null) => (d ? d.replace(/-/g, ".") : "미정")

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6" />
            <div>
              <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
              <h1 className="text-white text-2xl">강좌 등록하기</h1>
              <p className="text-slate-300 text-sm">강좌를 등록하고 대시보드 노출 여부를 관리합니다.</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditingCourse(null); setForm(EMPTY_FORM); setShowForm((v) => !v) }}
            className="bg-white text-slate-800 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4 mr-1" />
            새 강좌 등록
          </Button>
        </div>
      </div>

      {coursesQuery.error && (
        <LoadError
          message={coursesQuery.error}
          onRetry={coursesQuery.refresh}
          stale={coursesQuery.courses.length > 0}
        />
      )}

      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50 rounded-t-xl">
            <CardTitle className="text-base text-blue-800">
              {editingCourse ? `강좌 수정 — ${editingCourse.name}` : "새 강좌 등록"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="name">강좌명 *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="예: 프론트엔드 8기"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recruitment_start">모집 시작일 *</Label>
                  <Input
                    id="recruitment_start"
                    type="date"
                    value={form.recruitment_start}
                    onChange={(e) => updateField("recruitment_start", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recruitment_end">모집 종료일 *</Label>
                  <Input
                    id="recruitment_end"
                    type="date"
                    value={form.recruitment_end}
                    onChange={(e) => updateField("recruitment_end", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="training_start">교육 시작일 *</Label>
                  <Input
                    id="training_start"
                    type="date"
                    value={form.training_start}
                    onChange={(e) => updateField("training_start", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="training_end">교육 종료일 *</Label>
                  <Input
                    id="training_end"
                    type="date"
                    value={form.training_end}
                    onChange={(e) => updateField("training_end", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">모집정원 *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                    placeholder="20"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price">수강료 (원) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={10}
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="instructor">강사명</Label>
                  <Input
                    id="instructor"
                    value={form.instructor}
                    onChange={(e) => updateField("instructor", e.target.value)}
                    placeholder="홍길동"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">교육장소</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="서울 강남구 역삼동"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? (editingCourse ? "수정 중..." : "등록 중...")
                    : (editingCourse ? "수정 완료" : "등록")}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b bg-gray-50 rounded-t-xl">
          <CardTitle className="text-base text-gray-700">
            전체 강좌 ({coursesQuery.courses.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {coursesQuery.loading && coursesQuery.courses.length === 0 ? (
            <div className="py-12 text-center text-gray-400">불러오는 중...</div>
          ) : coursesQuery.courses.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              등록된 강좌가 없습니다. 새 강좌를 등록해주세요.
            </div>
          ) : (
            <div className="divide-y">
              {coursesQuery.courses.map((course) => (
                <div key={course.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{course.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          course.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {course.is_active ? "활성" : "비활성"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <div>모집: {fmt(course.recruitment_start)} ~ {fmt(course.recruitment_end)}</div>
                      <div>교육: {fmt(course.training_start)} ~ {fmt(course.training_end)}</div>
                      <div className="flex flex-wrap gap-4">
                        <span>정원 {course.capacity}명</span>
                        <span>{course.price.toLocaleString()}원</span>
                        {course.instructor && <span>강사: {course.instructor}</span>}
                        {course.location && <span>장소: {course.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${course.id}`} className="text-xs text-gray-500 cursor-pointer">
                        대시보드 노출
                      </Label>
                      <Switch
                        id={`active-${course.id}`}
                        checked={course.is_active}
                        disabled={togglingId === course.id}
                        onCheckedChange={() => handleToggleActive(course)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleEdit(course)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={deletingId === course.id}
                      onClick={() => handleDelete(course)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
