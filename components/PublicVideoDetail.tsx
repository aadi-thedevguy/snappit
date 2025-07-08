import { daysAgo } from "@/lib/utils";
import { Eye } from "lucide-react";
import React from "react";

type Props = {
  video: {
    title: string;
    createdAt: Date;
    views: number;
  };
};
function PublicVideoDetail({ video }: Props) {
  return (
    <header className="detail-header">
      <aside className="user-info">
        <h1>{video.title}</h1>
        <figure>
          <p>{daysAgo(video.createdAt)}</p>
          <figcaption>
            <span className="mt-1">・</span>
            <p className="flex items-center gap-1">
              <Eye className="w-4 h-4 inline-block" />
              <span>{video.views} views</span>
            </p>
          </figcaption>
        </figure>
      </aside>
    </header>
  );
}

export default PublicVideoDetail;
