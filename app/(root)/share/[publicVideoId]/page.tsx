import { redirect } from "next/navigation";
import { VideoInfo, VideoPlayer } from "@/components";
import { getVideoByPublicVideoId } from "@/lib/actions/video";
import PublicVideoDetail from "@/components/PublicVideoDetail";

const page = async ({ params }: Params) => {
  const { publicVideoId } = await params;

  const videoData = await getVideoByPublicVideoId(publicVideoId);
  if (!videoData) redirect("/404");

  const { video } = videoData;

  return (
    <main className="wrapper page">
      <PublicVideoDetail video={video} />

      <section className="video-details">
        <div className="content">
          <VideoPlayer videoId={video.videoId} videoUrl={video.videoUrl} />
        </div>

        <VideoInfo
          title={video.title}
          createdAt={video.createdAt}
          description={video.description}
          videoId={video.videoId}
          videoUrl={video.videoUrl}
        />
      </section>
    </main>
  );
};

export default page;
