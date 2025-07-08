"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import RecordScreen from "./RecordScreen";
import { filterOptions } from "@/constants";
import ImageWithFallback from "./ImageWithFallback";
import DropdownList from "./DropdownList";
import { updateURLParams } from "@/lib/utils";
import { ChevronDown, MenuIcon, Search, Upload } from "lucide-react";

const SharedHeader = ({ subHeader, title, userImg }: SharedHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("query") || ""
  );
  const [selectedFilter, setSelectedFilter] = useState(
    searchParams.get("filter") || "Most Recent"
  );

  useEffect(() => {
    setSearchQuery(searchParams.get("query") || "");
    setSelectedFilter(searchParams.get("filter") || "Most Recent");
  }, [searchParams]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery !== searchParams.get("query")) {
        const url = updateURLParams(
          searchParams,
          { query: searchQuery || null },
          pathname
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
      pathname
    );
    router.push(url);
  };

  const renderFilterTrigger = () => (
    <div className="filter-trigger">
      <figure>
        <MenuIcon className="w-4 h-4" />
        <span>{selectedFilter}</span>
      </figure>
      <ChevronDown className="w-4 h-4" />
    </div>
  );

  return (
    <header className="header">
      <section className="header-container">
        <figure className="details">
          {userImg && (
            <ImageWithFallback
              src={userImg}
              alt="user"
              width={66}
              height={66}
              className="rounded-full"
            />
          )}
          <article>
            <p>{subHeader}</p>
            <h1>{title}</h1>
          </article>
        </figure>
        <aside>
          <Link href="/upload">
            <Upload className="w-4 h-4" />
            <span>Upload a video</span>
          </Link>
          <RecordScreen />
        </aside>
      </section>
      <section className="search-filter">
        <div className="search">
          <input
            type="text"
            placeholder="Search for videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4" />
        </div>
        <DropdownList
          options={filterOptions}
          selectedOption={selectedFilter}
          onOptionSelect={handleFilterChange}
          triggerElement={renderFilterTrigger()}
        />
      </section>
    </header>
  );
};

export default SharedHeader;
