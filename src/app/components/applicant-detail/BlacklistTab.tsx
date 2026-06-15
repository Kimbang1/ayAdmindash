import { useEffect, useState } from "react";

import type { Application } from "../../lib/types";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import type { ApplicationSaveFields } from "./ApplicantDetailWindow";

interface BlacklistTabProps {
  application: Application;
  onSave: (updates: ApplicationSaveFields) => void | Promise<void>;
  saving: boolean;
}

export function BlacklistTab({ application, onSave, saving }: BlacklistTabProps) {
  const [isBlacklisted, setIsBlacklisted] = useState(application.is_blacklisted);
  const [reason, setReason] = useState(application.blacklist_reason ?? "");

  useEffect(() => {
    setIsBlacklisted(application.is_blacklisted);
    setReason(application.blacklist_reason ?? "");
  }, [application.is_blacklisted, application.blacklist_reason]);

  const isDirty =
    isBlacklisted !== application.is_blacklisted || reason !== (application.blacklist_reason ?? "");

  return (
    <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4">
      <h3 className="text-sm font-semibold text-red-900">블랙리스트</h3>

      <div className="space-y-3 rounded-md border border-red-100 bg-white p-3">
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-900">블랙리스트로 등록</span>
          <Switch checked={isBlacklisted} onCheckedChange={setIsBlacklisted} disabled={saving} />
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="블랙리스트 사유를 입력하세요"
          rows={3}
          disabled={saving}
        />
        <Button
          size="sm"
          variant="destructive"
          disabled={!isDirty || saving}
          onClick={() => onSave({ is_blacklisted: isBlacklisted, blacklist_reason: reason || null })}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
