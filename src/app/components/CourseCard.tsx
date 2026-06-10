import { Clock, Users, BookOpen } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface CourseCardProps {
  title: string;
  category: string;
  duration: string;
  applicants: number;
  newApplicants?: number;
  status?: "모집중" | "마감임박" | "마감";
}

const statusColors: Record<string, string> = {
  "모집중": "bg-green-100 text-green-700",
  "마감임박": "bg-orange-100 text-orange-700",
  "마감": "bg-gray-100 text-gray-500",
};

export function CourseCard({
  title,
  category,
  duration,
  applicants,
  newApplicants = 0,
  status = "모집중",
}: CourseCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <Badge variant="outline" className="text-xs">{category}</Badge>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
            {status}
          </span>
        </div>

        <h3 className="text-gray-900 mb-4 line-clamp-2 leading-snug">{title}</h3>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-900">{applicants.toLocaleString()}명</span>
            {newApplicants > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
                +{newApplicants}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
