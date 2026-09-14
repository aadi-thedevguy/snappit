"use client";
import Image from "next/image";
import ImageWithFallback from "./ImageWithFallback";
import Link from "next/link";
import { useState } from "react";
import { Check, EyeIcon, LinkIcon } from "lucide-react";

const VideoCard = ({
  id,
  title,
  thumbnail,
  userImg,
  username,
  createdAt,
  views,
  visibility,
  duration,
}: VideoCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(`${window.location.origin}/video/${id}`);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <Link href={`/video/${id}`} className="video-card">
      <Image
        src={thumbnail}
        width={290}
        height={160}
        alt="thumbnail"
        className="thumbnail"
      />
      <article>
        <div>
          <figure>
            <ImageWithFallback
              src={userImg}
              width={34}
              height={34}
              alt="avatar"
              className="rounded-full aspect-square"
            />
            <figcaption>
              <h3>{username}</h3>
              <p>{visibility}</p>
            </figcaption>
          </figure>
          <aside>
            <EyeIcon className="w-4 h-4" />
            <span>{views}</span>
          </aside>
        </div>
        <h2>
          {title} -{" "}
          {createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </h2>
      </article>
      <button onClick={handleCopy} className="copy-btn">
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
      </button>
      {duration && (
        <div className="duration">
          {duration < 60
            ? `00:${duration}`
            : `${Math.floor(duration / 60)}:${duration % 60}`}
        </div>
      )}
    </Link>
  );
};

export default VideoCard;
