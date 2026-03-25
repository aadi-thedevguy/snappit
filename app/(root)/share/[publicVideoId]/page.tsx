import { redirect } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import VideoInfo from "@/components/VideoInfo";
import { getVideoByPublicVideoId } from "@/lib/actions/video";
import PublicVideoDetail from "@/components/PublicVideoDetail";

const page = async ({ params }: Params) => {
  const { publicVideoId } = await params;

  const videoData = await getVideoByPublicVideoId(publicVideoId);
  if (!videoData) redirect("/404");

  const { video } = videoData;

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <PublicVideoDetail video={video} />

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
            videoId={video.videoId}
            videoUrl={video.videoUrl}
            duration={video.duration ?? 0}
          />
        </div>
      </section>
    </main>
  );
};

export default page;
