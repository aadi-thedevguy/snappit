import { notFound } from "next/navigation";

import VideoDetailHeader from "@/components/VideoDetailHeader";
import VideoInfo from "@/components/VideoInfo";
import VideoPlayer from "@/components/VideoPlayer";
import {
  generateSignedVideoUrl,
  getPlayableVideoStorageKey,
  getVideoById,
} from "@/lib/actions/video";

const page = async ({ params }: Params) => {
  const { videoId } = await params;

  const { data: videoData, error } = await getVideoById(videoId);
  if (!videoData || error) notFound();

  const { user, video } = videoData;
  const playableVideoKey = getPlayableVideoStorageKey(video);
  const initialSecureUrl = playableVideoKey
    ? await generateSignedVideoUrl(playableVideoKey)
    : undefined;

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <VideoDetailHeader
              title={video.title}
              createdAt={video.createdAt}
              userImg={user?.image}
              username={user?.name}
              videoId={video.videoId}
              publicVideoId={video.visibility === "public" ? video.publicVideoId : undefined}
              views={video.views}
            />

            <div className="rounded-xl overflow-hidden shadow-card bg-foreground/5">
              {playableVideoKey ? (
                <VideoPlayer
                  videoId={video.videoId}
                  initialSecureUrl={initialSecureUrl}
                  duration={video.duration ?? 0}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center p-8 text-center text-muted-foreground">
                  {video.processingStatus === "failed"
                    ? "Video processing failed. Please try uploading again."
                    : "Your video is being processed into a seekable MP4. This usually takes a few minutes."}
                </div>
              )}
            </div>
          </div>
          <VideoInfo
            title={video.title}
            createdAt={video.createdAt}
            description={video.description}
            videoId={videoId}
            duration={video.duration || 0}
            shareable={true}
          />
        </div>
      </section>
    </main>
  );
};

export default page;
