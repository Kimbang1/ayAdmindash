import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import type { Applicant } from "../lib/transform";

const statusColors = {
  "확정": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "대기": "bg-amber-100 text-amber-700 border-amber-200",
  "취소": "bg-red-100 text-red-600 border-red-200",
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

interface ApplicantTableProps {
  applicants: Applicant[];
  searchName: string;
  onSearchNameChange: (value: string) => void;
  onSelect?: (applicant: Applicant) => void;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

export function ApplicantTable({
  applicants,
  searchName,
  onSearchNameChange,
  onSelect,
}: ApplicantTableProps) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, pageSize]);

  const totalPages = Math.max(1, Math.ceil(applicants.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pageItems = applicants.slice(startIndex, startIndex + pageSize);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="이름 또는 상태로 검색..."
          value={searchName}
          onChange={(e) => onSearchNameChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Select
          value={String(pageSize)}
          onValueChange={(value) => setPageSize(Number(value))}
        >
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}개씩
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["번호", "이름", "나이", "연락처", "이메일", "신청일", "상태"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold text-gray-500 px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a, i) => (
              <tr
                key={a.id}
                onClick={() => onSelect?.(a)}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  i % 2 === 0 ? "" : "bg-gray-50/50"
                }`}
              >
                <td className="px-4 py-3 text-gray-400 text-xs">{a.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.age}세</td>
                <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.email}</td>
                <td className="px-4 py-3 text-gray-600">{a.appliedDate}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${statusColors[a.status]}`}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
                }}
                className={safeCurrentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pageNumbers.map((page, idx) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === safeCurrentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
                }}
                className={safeCurrentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
