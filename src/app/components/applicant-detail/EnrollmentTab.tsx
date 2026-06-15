import type { Application } from "../../lib/types";
import { DateFieldPopover } from "./DateFieldPopover";
import type { ApplicationSaveFields } from "./ApplicantDetailWindow";

interface EnrollmentTabProps {
  application: Application;
  onSave: (updates: ApplicationSaveFields) => void | Promise<void>;
  saving: boolean;
}

export function EnrollmentTab({ application, onSave, saving }: EnrollmentTabProps) {
  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
      <h3 className="text-sm font-semibold text-green-900">등록 예정일</h3>
      <div className="rounded-md border border-green-100 bg-white p-2">
        <DateFieldPopover
          value={application.enrollment_date}
          onChange={(date) => onSave({ enrollment_date: date })}
          placeholder="지정 안 함"
          disabled={saving}
        />
      </div>
      <p className="text-xs text-green-700">
        등록 예정일을 지정하면 해당 날짜에 등록 처리를 준비할 수 있습니다. 달력에서 날짜를 다시 선택하거나
        지우기(×)로 지정을 해제할 수 있습니다.
      </p>
    </div>
  );
}
