"use client";
import { cn, generatePagination, updateURLParams } from "@/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

type PaginationProps = {
  currentPage?: number;
  totalPages?: number;
  queryString?: string;
  filterString?: string;
};

const Pagination = ({
  currentPage = 1,
  totalPages = 10,
  queryString = "",
  filterString = "",
}: PaginationProps) => {
  const pages = generatePagination(currentPage, totalPages);
  const router = useRouter();
  const searchParams = useSearchParams();

  const createPageUrl = (pageNumber: number) => {
    return updateURLParams(
      searchParams,
      {
        page: pageNumber.toString(),
        query: queryString?.trim() || null,
        filter: filterString || null,
      },
      "/",
    );
  };

  const navigateToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    router.push(createPageUrl(pageNumber));
  };

  return (
    <footer className="flex justify-between items-center py-5 gap-5 border-t border-gray-20">
      <Button
        onClick={() => navigateToPage(currentPage - 1)}
        className={cn({
          "pointer-events-none opacity-50": currentPage === 1,
        })}
        disabled={currentPage === 1}
        aria-disabled={currentPage === 1}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Previous
      </Button>

      <div>
        {pages.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <Button
              key={`page-${page}`}
              onClick={() => navigateToPage(page as number)}
              className={cn({
                "bg-sky-100 text-white": currentPage === page,
              })}
            >
              {page}
            </Button>
          ),
        )}
      </div>

      <Button
        onClick={() => navigateToPage(currentPage + 1)}
        className={cn({
          "pointer-events-none opacity-50": currentPage === totalPages,
        })}
        disabled={currentPage === totalPages}
      >
        Next
        <ArrowRightIcon className="w-4 h-4" />
      </Button>
    </footer>
  );
};

export default Pagination;
