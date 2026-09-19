import { daysAgo } from "@/lib/utils";
import { Calendar, Eye } from "lucide-react";
import PublicVideoDownloadButton from "@/components/PublicVideoDownloadButton";

type Props = {
  video: {
    title: string;
    createdAt: Date;
    views: number;
  };
  downloadUrl?: string;
};
function PublicVideoDetail({ video, downloadUrl }: Props) {
  return (
    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-display font-bold text-foreground">{video.title}</h1>
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
      {downloadUrl && <PublicVideoDownloadButton downloadUrl={downloadUrl} />}
    </header>
  );
}

export default PublicVideoDetail;
