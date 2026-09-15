"use client";
import { formatDuration } from "@/lib/utils";

const VideoInfo = ({
  description,
  videoId,
  title,
  shareable,
  duration,
}: VideoInfoProps) => {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-sky-100 border-b-2 border-sky-100 pb-2 mb-4">
          Metadata
        </h2>
        <div className="space-y-4">
          <MetaField label="Video title" value={title} />
          <MetaField label="Video description" value={description} />
          {shareable && <MetaField label="Video id" value={videoId} />}
          {duration && (
            <MetaField label="Duration" value={formatDuration(duration)} />
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoInfo;

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="my-8">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p
        className={`${label == "Video title" ? "text-lg font-semibold" : "font-medium"} text-foreground`}
      >
        {value}
      </p>
    </div>
  );
}
