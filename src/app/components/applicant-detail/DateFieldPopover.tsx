import { CalendarIcon, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";

interface DateFieldPopoverProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateFieldPopover({
  value,
  onChange,
  placeholder = "날짜 선택",
  allowClear = true,
  disabled = false,
  className,
}: DateFieldPopoverProps) {
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal bg-white",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? format(selectedDate as Date, "yyyy년 M월 d일 (eee)", { locale: ko }) : placeholder}
          {allowClear && value && (
            <X
              className="ml-auto size-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : null)}
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  );
}
