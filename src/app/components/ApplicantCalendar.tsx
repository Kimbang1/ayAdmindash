import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./ui/hover-card";
import type { Applicant } from "../lib/transform";

const MONTH_NAMES = [
  "1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월",
];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const APPLICANT_CHIP = "APPLICANT_CHIP";

interface DragItem {
  applicationId: string;
}

interface ApplicantCalendarProps {
  applicants: Applicant[];
  onScheduledDateChange: (applicationId: string, newDate: string) => void;
  onSelect?: (applicant: Applicant) => void;
}

function ApplicantChip({
  applicant,
  onSelect,
}: {
  applicant: Applicant;
  onSelect?: (applicant: Applicant) => void;
}) {
  const wasDraggingRef = useRef(false);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: APPLICANT_CHIP,
    item: { applicationId: applicant.applicationId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [applicant.applicationId]);

  useEffect(() => {
    if (isDragging) wasDraggingRef.current = true;
  }, [isDragging]);

  const handleClick = () => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    onSelect?.(applicant);
  };

  const isScheduled = applicant.scheduledDate != null;

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <div
          ref={(node) => { drag(node); }}
          onClick={handleClick}
          className={`text-xs text-white rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer transition-opacity ${
            isScheduled ? "bg-blue-600" : "bg-amber-500"
          } ${isDragging ? "opacity-40" : "opacity-100"}`}
        >
          {applicant.name}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto p-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">{applicant.name}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {applicant.consultationStatus}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CalendarCell({
  day,
  dow,
  dateStr,
  applicants,
  onScheduledDateChange,
  onSelect,
}: {
  day: number;
  dow: number;
  dateStr: string;
  applicants: Applicant[];
  onScheduledDateChange: (applicationId: string, newDate: string) => void;
  onSelect?: (applicant: Applicant) => void;
}) {
  const [{ isOver }, drop] = useDrop<DragItem, unknown, { isOver: boolean }>(() => ({
    accept: APPLICANT_CHIP,
    drop: (item) => {
      onScheduledDateChange(item.applicationId, dateStr);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [dateStr, onScheduledDateChange]);

  const hasApplicants = applicants.length > 0;

  return (
    <div
      ref={(node) => { drop(node); }}
      className={`min-h-16 rounded-lg p-1.5 border transition-colors ${
        isOver
          ? "bg-emerald-50 border-emerald-300"
          : hasApplicants
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-gray-100 hover:bg-gray-50"
      }`}
    >
      <div
        className={`text-xs font-semibold mb-1 ${
          dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-700"
        }`}
      >
        {day}
      </div>
      {applicants.slice(0, 2).map((applicant) => (
        <ApplicantChip key={applicant.id} applicant={applicant} onSelect={onSelect} />
      ))}
      {applicants.length > 2 && (
        <div className="text-xs text-blue-500 font-medium">+{applicants.length - 2}명</div>
      )}
    </div>
  );
}

function ApplicantCalendarInner({
  applicants,
  onScheduledDateChange,
  onSelect,
}: ApplicantCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate: Record<string, Applicant[]> = {};
  applicants.forEach((a) => {
    const d = a.scheduledDate ?? a.appliedDate;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(a);
  });

  const prev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const next = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prev}
          aria-label="이전 달 보기"
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="font-semibold text-gray-800">
          {year}년 {MONTH_NAMES[month]}
        </span>
        <button
          onClick={next}
          aria-label="다음 달 보기"
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
          상담 예정일 지정됨
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-500" />
          상담 예정일 미지정 (신청일 기준 표시)
        </span>
        <span className="text-gray-400">이름을 드래그하여 다른 날짜로 상담 예정일을 변경할 수 있습니다.</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayApplicants = byDate[dateStr] ?? [];
          const dow = (firstDay + day - 1) % 7;

          return (
            <CalendarCell
              key={day}
              day={day}
              dow={dow}
              dateStr={dateStr}
              applicants={dayApplicants}
              onScheduledDateChange={onScheduledDateChange}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ApplicantCalendar(props: ApplicantCalendarProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <ApplicantCalendarInner {...props} />
    </DndProvider>
  );
}
