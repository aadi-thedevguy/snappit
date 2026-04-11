"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Eye,
  Globe,
  LinkIcon,
  Lock,
  Monitor,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { videos } from "@/drizzle/schema";
import { formatDuration } from "@/lib/utils";
import { useState } from "react";
import { EditDialog, ShareDialog, DeleteDialog } from "./VideoDialogs";

type VideoType = typeof videos.$inferSelect;

const VideoGrid = ({ videos }: { videos: VideoType[] }) => {
  const [editRecording, setEditRecording] = useState<VideoType | null>(null);
  const [deleteRecording, setDeleteRecording] = useState({
    id: "",
    thumbnailUrl: "",
  });
  const [shareRecording, setShareRecording] = useState<VideoType | null>(null);
  // const [copied, setCopied] = useState(false);

  // const handleCopy = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   navigator.clipboard.writeText(`${window.location.origin}/video/${id}`);
  //   setCopied(true);
  //   setTimeout(() => {
  //     setCopied(false);
  //   }, 3000);
  // };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos?.map((video) => (
        <VideoCard
          key={video.id}
          recording={video}
          onEdit={() => setEditRecording(video)}
          onDelete={() =>
            setDeleteRecording({
              id: video?.videoId,
              thumbnailUrl: video?.thumbnailUrl,
            })
          }
          onShare={() => setShareRecording(video)}
        />
      ))}
      {editRecording && (
        <EditDialog
          recording={editRecording}
          onClose={() => setEditRecording(null)}
        />
      )}
      {deleteRecording.id && (
        <DeleteDialog
          {...deleteRecording}
          onClose={() =>
            setDeleteRecording({
              id: "",
              thumbnailUrl: "",
            })
          }
        />
      )}
      {shareRecording && (
        <ShareDialog
          recording={shareRecording}
          onClose={() => setShareRecording(null)}
        />
      )}
    </section>
  );
};

export default VideoGrid;

function VideoCard({
  recording,
  onEdit,
  onDelete,
  onShare,
}: {
  recording: VideoType;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  return (
    <Card className="group shadow-card hover:shadow-elegant transition-all duration-300 overflow-hidden border-border">
      <Link href={`/video/${recording.videoId}`}>
        <div className="aspect-video bg-muted relative overflow-hidden">
          {recording.thumbnailUrl ? (
            <Image
              src={recording.thumbnailUrl}
              alt={recording.title}
              width={300}
              height={200}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center gradient-primary opacity-20">
              <Monitor className="h-12 w-12 text-primary" />
            </div>
          )}
          {/* Duration badge */}
          {recording.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-foreground/80 text-background text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(recording.duration)}
            </div>
          )}
          {/* Visibility badge */}
          <div className="absolute top-2 left-2">
            <Badge
              variant={
                recording.visibility === "public" ? "default" : "secondary"
              }
              className="text-xs gap-1 capitalize"
            >
              {recording.visibility === "public" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {recording.visibility}
            </Badge>
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground truncate">
              {recording.title}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {recording.views}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShare} className="text-gray-100">
                <LinkIcon className="mr-2 h-4 w-4" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="text-sky-100">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
