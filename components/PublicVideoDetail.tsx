import { daysAgo } from "@/lib/utils";
import { Calendar, Eye } from "lucide-react";

type Props = {
  video: {
    title: string;
    createdAt: Date;
    views: number;
    publicVideoId: string | null;
  };
};
function PublicVideoDetail({ video }: Props) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {video.title}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {daysAgo(video.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {video.views} views
          </span>
        </div>
      </div>
    </header>
  );
}

export default PublicVideoDetail;
