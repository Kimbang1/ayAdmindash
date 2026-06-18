export const PAGE_HEADERS = {
  dashboard:        "from-slate-800 to-slate-700",
  applications:     "from-slate-700 to-slate-600",
  stats:            "from-slate-700 to-slate-600",
  courseManagement: "from-slate-800 to-slate-700",
  courseDetail:     "from-slate-600 to-slate-500",
  blacklist:        "from-slate-700 to-slate-600",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "웹 개발":    "bg-blue-600",
  "데이터":     "bg-blue-600",
  "컴퓨터":     "bg-blue-600",
  "프로그래밍": "bg-blue-600",
  "모바일":     "bg-blue-600",
  "AI/ML":      "bg-blue-600",
  "인프라":     "bg-blue-600",
  "세무":       "bg-emerald-600",
  "디자인":     "bg-slate-500",
  "영상":       "bg-slate-500",
};

export const CATEGORY_COLOR_DEFAULT = "bg-slate-500";

export const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#64748b"] as const;

export const KPI_CARD_STYLES = {
  blue:    { border: "border-blue-100",    icon: "bg-blue-50",    text: "text-blue-600" },
  emerald: { border: "border-emerald-100", icon: "bg-emerald-50", text: "text-emerald-600" },
  amber:   { border: "border-amber-100",   icon: "bg-amber-50",   text: "text-amber-600" },
  violet:  { border: "border-violet-100",  icon: "bg-violet-50",  text: "text-violet-600" },
} as const;
