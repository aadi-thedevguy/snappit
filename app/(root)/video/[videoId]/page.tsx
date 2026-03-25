import { redirect } from "next/navigation";

import VideoDetailHeader from "@/components/VideoDetailHeader";
import VideoInfo from "@/components/VideoInfo";
import VideoPlayer from "@/components/VideoPlayer";
import { getVideoById } from "@/lib/actions/video";

const page = async ({ params }: Params) => {
  const { videoId } = await params;

  const videoData = await getVideoById(videoId);
  if (!videoData) redirect("/404");

  const { user, video } = videoData;

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
              publicVideoId={video.publicVideoId ?? undefined}
              views={video.views}
            />

            <div className="rounded-xl overflow-hidden shadow-card bg-foreground/5">
              <VideoPlayer
                videoId={video.videoId}
                videoUrl={video.videoUrl}
                duration={video.duration ?? 0}
              />
            </div>
          </div>
          <VideoInfo
            title={video.title}
            createdAt={video.createdAt}
            description={video.description}
            videoId={videoId}
            videoUrl={video.videoUrl}
            duration={video.duration || 0}
            shareable={true}
          />
        </div>
      </section>
    </main>
  );
};

export default page;
