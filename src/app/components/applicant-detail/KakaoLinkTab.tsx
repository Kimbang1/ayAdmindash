import { useEffect, useState } from "react";

import type { Application, ApplicationSaveFields } from "../../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface KakaoLinkTabProps {
  application: Application;
  onSave: (updates: ApplicationSaveFields) => void | Promise<void>;
  saving: boolean;
}

export function KakaoLinkTab({ application, onSave, saving }: KakaoLinkTabProps) {
  const [link, setLink] = useState(application.kakao_link ?? "");

  useEffect(() => {
    setLink(application.kakao_link ?? "");
  }, [application.kakao_link]);

  const isDirty = link !== (application.kakao_link ?? "");

  return (
    <div className="space-y-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <h3 className="text-sm font-semibold text-yellow-900">카카오톡 링크</h3>

      <div className="space-y-2 rounded-md border border-yellow-100 bg-white p-3">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://open.kakao.com/..."
          disabled={saving}
        />
        <Button
          size="sm"
          disabled={!isDirty || saving}
          onClick={() => onSave({ kakao_link: link })}
        >
          저장
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {application.kakao_link ? (
          <a href={application.kakao_link} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              상담 연결
            </Button>
          </a>
        ) : (
          <Button variant="outline" size="sm" disabled>
            상담 연결
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                보내기
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>아직 지원하지 않는 기능입니다</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
