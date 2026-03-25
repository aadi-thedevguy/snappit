"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { updateURLParams } from "@/lib/utils";
import { Monitor, Search, Upload } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const SharedHeader = ({ videoLength }: { videoLength: number }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("query") || "",
  );
  const [selectedFilter, setSelectedFilter] = useState(
    searchParams.get("filter") || "most recent",
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(searchParams.get("query") || "");
    setSelectedFilter(searchParams.get("filter") || "most recent");
  }, [searchParams]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery !== searchParams.get("query")) {
        const url = updateURLParams(
          searchParams,
          { query: searchQuery || null },
          pathname,
        );
        router.push(url);
      }
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchParams, pathname, router]);

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    const url = updateURLParams(
      searchParams,
      { filter: filter || null },
      pathname,
    );
    router.push(url);
  };

  return (
    <header className="flex flex-col gap-4 mb-8">
      <div className="flex items-center flex-wrap gap-4 justify-between w-full">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            My Recordings
          </h1>
          <p className="text-muted-foreground mt-1">
            {videoLength} recording
            {videoLength !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/upload">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 shadow-elegant rounded-full"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload a Video</span>
            </Button>
          </Link>
          <Link href="/record">
            <Button
              size="lg"
              className="bg-sky-100 gap-2 shadow-elegant rounded-full"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Record a Video</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-4 justify-between w-full">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 py-4 w-full rounded-full"
          />
        </div>
        <div>
          <Select onValueChange={handleFilterChange} value={selectedFilter}>
            <SelectTrigger className="w-full max-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most viewed">Most Viewed</SelectItem>
              <SelectItem value="most recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};

export default SharedHeader;
