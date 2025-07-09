"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  EyeIcon,
  LinkIcon,
  Loader2,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { visibilities } from "@/constants";
import DropdownList from "./DropdownList";
import ImageWithFallback from "./ImageWithFallback";
import { daysAgo } from "@/lib/utils";
import { deleteVideo, updateVideoVisibility } from "@/lib/actions/video";

const VideoDetailHeader = ({
  title,
  createdAt,
  userImg,
  username,
  videoId,
  publicVideoId,
  ownerId,
  visibility,
  thumbnailUrl,
}: VideoDetailHeaderProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibilityState, setVisibilityState] = useState<Visibility>(
    visibility as Visibility
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const isOwner = userId === ownerId;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteVideo(videoId, thumbnailUrl);
      router.push("/");
    } catch (error) {
      console.error("Error deleting video:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVisibilityChange = async (option: string) => {
    if (option !== visibilityState) {
      setIsUpdating(true);
      try {
        await updateVideoVisibility(videoId, option as Visibility);
        setVisibilityState(option as Visibility);
      } catch (error) {
        console.error("Error updating visibility:", error);
      } finally {
        setIsUpdating(false);
        setCopied(false);
      }
    }
  };

  const copyLink = () => {
    console.log(publicVideoId)
    if (!publicVideoId) {
      navigator.clipboard.writeText(
        `${window.location.origin}/video/${videoId}`
      );
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/share/${publicVideoId}`
      );
    }
    setCopied(true);
  };

  const TriggerVisibility = (
    <div className="visibility-trigger">
      <div>
        <EyeIcon className="w-4 h-4 mt-0.5" />
        <p>{visibilityState}</p>
      </div>
      <ChevronDown className="w-4 h-4 mt-0.5" />
    </div>
  );

  return (
    <header className="detail-header">
      <aside className="user-info">
        <h1>{title}</h1>
        <figure>
          <ImageWithFallback
            src={userImg ?? ""}
            width={24}
            alt="User"
            className="rounded-full"
            height={24}
          />
          <h2>{username ?? "Guest"}</h2>
          <figcaption>
            <p>
              <span className="mt-1">・</span>
              <span>{daysAgo(createdAt)}</span>
            </p>
          </figcaption>
        </figure>
      </aside>
      <aside className="cta">
        <button onClick={copyLink}>
          {copied ? (
            <Check className="w-6 h-6 text-green-600" />
          ) : (
            <LinkIcon className="w-6 h-6" />
          )}
        </button>
        {isOwner && (
          <div className="user-btn">
            <button
              className="delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin inline-block ml-1" />
              ) : (
                <Trash className="w-4 h-4 inline-block ml-1" />
              )}
            </button>
            <div className="bar" />
            {isUpdating ? (
              <div className="update-stats">
                <p>Updating...</p>
              </div>
            ) : (
              <DropdownList
                options={visibilities}
                selectedOption={visibilityState}
                onOptionSelect={handleVisibilityChange}
                triggerElement={TriggerVisibility}
              />
            )}
          </div>
        )}
      </aside>
    </header>
  );
};

export default VideoDetailHeader;
