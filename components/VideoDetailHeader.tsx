"use client";

import { Calendar, Copy, Eye, Globe, Lock } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import { daysAgo } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

const VideoDetailHeader = ({
  title,
  createdAt,
  userImg,
  username,
  videoId,
  publicVideoId,
  views,
}: VideoDetailHeaderProps) => {
  // const handleDelete = async () => {
  //   try {
  //     setIsDeleting(true);
  //     await deleteVideo(videoId, thumbnailUrl);
  //     router.push("/");
  //   } catch (error) {
  //     console.error("Error deleting video:", error);
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };
  // await updateVideoVisibility(videoId, option as Visibility);

  const copyLink = () => {
    if (!publicVideoId) {
      navigator.clipboard.writeText(
        `${window.location.origin}/video/${videoId}`,
      );
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/share/${publicVideoId}`,
      );
    }
    toast.success("Link copied to clipboard");
  };

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {title}
        </h1>
        <div className="flex items-center flex-wrap gap-1 md:gap-3 mt-2 text-sm text-gray-100">
          <div className="flex gap-1 items-center">
            <ImageWithFallback
              src={userImg ?? ""}
              width={24}
              alt="User"
              className="rounded-full"
              height={24}
            />
            <h2>{username ?? "Guest"}</h2>
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {daysAgo(createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {views} views
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={copyLink}>
          <Copy className="h-4 w-4" />
        </Button>
        <Badge
          variant={publicVideoId ? "default" : "secondary"}
          className="gap-1"
        >
          {publicVideoId ? (
            <Globe className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {publicVideoId ? "Public" : "Private"}
        </Badge>
      </div>
    </header>
  );
};

export default VideoDetailHeader;
