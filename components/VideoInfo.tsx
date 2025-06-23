"use client";
import { cn } from "@/lib/utils";
import { useState } from "react";

const VideoInfo = ({
  createdAt,
  description,
  videoId,
  videoUrl,
  title,
}: VideoInfoProps) => {
  const [info, setInfo] = useState("metadata");

  const metaDatas = [
    {
      label: "Video title",
      value: `${title} - ${new Date(createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
    },
    {
      label: "Video description",
      value: description,
    },
    {
      label: "Video id",
      value: videoId,
    },
    {
      label: "Video url",
      value: videoUrl,
    },
  ];

  const renderMetadata = () => (
    <div className="metadata">
      {metaDatas.map(({ label, value }, index) => (
        <article key={index}>
          <h2>{label}</h2>
          <p
            className={cn({
              "text-sky-100 truncate": label === "Video url",
            })}
          >
            {value}
          </p>
        </article>
      ))}
    </div>
  );

  return (
    <section className="video-info">
      <nav>
        <button
          className={cn({
            "text-sky-100 border-b-2 border-sky-100": info === "metadata",
          })}
          onClick={() => setInfo("metadata")}
        >
          Metadata
        </button>
      </nav>
      {info === "metadata" ? renderMetadata() : null}
    </section>
  );
};

export default VideoInfo;
