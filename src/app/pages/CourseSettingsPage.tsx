import { useEffect, useState } from "react";
import { Save, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LoadError } from "../components/LoadError";
import { useCourses } from "../lib/useCourses";
import { useAuth } from "../lib/auth";
import { updateAdminCourse } from "../lib/api";
import type { CourseConfig } from "../lib/types";
import { toast } from "sonner";

export function CourseSettingsPage() {
  const { token } = useAuth();
  const coursesQuery = useCourses();
  const [drafts, setDrafts] = useState<CourseConfig[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    setDrafts(coursesQuery.courses);
  }, [coursesQuery.courses]);

  const updateDraft = (id: number, field: keyof CourseConfig, value: string | number) => {
    setDrafts((current) =>
      current.map((course) => (course.id === id ? { ...course, [field]: value } : course))
    );
  };

  const save = async (course: CourseConfig) => {
    if (!token) return;
    if (!course.name.trim() || course.capacity <= 0 || course.price < 0) {
      toast.error("강좌명, 정원, 금액을 확인해주세요");
      return;
    }
    setSavingId(course.id);
    try {
      const response = await updateAdminCourse(token, {
        id: course.id,
        name: course.name.trim(),
        training_start: course.training_start ?? undefined,
        training_end: course.training_end ?? undefined,
        capacity: course.capacity,
        price: course.price,
      });
      coursesQuery.setCourses((current) =>
        current.map((item) => (item.id === response.course.id ? response.course : item))
      );
      toast.success(`${response.course.name} 설정을 저장했습니다`);
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "강좌 설정을 저장하지 못했습니다");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <div>
            <p className="text-slate-400 text-sm mb-1">관리자 설정</p>
            <h1 className="text-white text-2xl">강좌 설정</h1>
            <p className="text-slate-300 text-sm">강좌별 정원과 등록 금액을 관리합니다.</p>
          </div>
        </div>
      </div>

      {coursesQuery.error && (
        <LoadError
          message={coursesQuery.error}
          onRetry={coursesQuery.refresh}
          stale={coursesQuery.courses.length > 0}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">강좌 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {coursesQuery.loading && drafts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">강좌 정보를 불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">강좌</th>
                    <th className="px-4 py-3 text-left">교육 시작</th>
                    <th className="px-4 py-3 text-left">교육 종료</th>
                    <th className="px-4 py-3 text-left">정원</th>
                    <th className="px-4 py-3 text-left">금액(원)</th>
                    <th className="px-4 py-3 text-right">저장</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((course) => (
                    <tr key={course.id} className="border-t">
                      <td className="px-4 py-3 min-w-56">
                        <Input
                          aria-label={`${course.slug} 강좌명`}
                          value={course.name}
                          onChange={(event) => updateDraft(course.id, "name", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 min-w-36">
                        <Input
                          aria-label={`${course.name} 교육 시작일`}
                          type="date"
                          value={course.training_start ?? ""}
                          onChange={(event) => updateDraft(course.id, "training_start", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 min-w-36">
                        <Input
                          aria-label={`${course.name} 교육 종료일`}
                          type="date"
                          value={course.training_end ?? ""}
                          onChange={(event) => updateDraft(course.id, "training_end", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <Input
                          aria-label={`${course.name} 정원`}
                          type="number"
                          min={1}
                          value={course.capacity}
                          onChange={(event) =>
                            updateDraft(course.id, "capacity", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 w-48">
                        <Input
                          aria-label={`${course.name} 금액`}
                          type="number"
                          min={0}
                          step={1000}
                          value={course.price}
                          onChange={(event) => updateDraft(course.id, "price", Number(event.target.value))}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          disabled={savingId === course.id}
                          onClick={() => save(course)}
                        >
                          <Save className="h-4 w-4" />
                          {savingId === course.id ? "저장 중" : "저장"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

