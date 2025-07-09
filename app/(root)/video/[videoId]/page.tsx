import { redirect } from "next/navigation";

import { VideoDetailHeader, VideoInfo, VideoPlayer } from "@/components";
import { getVideoById } from "@/lib/actions/video";

const page = async ({ params }: Params) => {
  const { videoId } = await params;

  const videoData = await getVideoById(videoId);
  if (!videoData) redirect("/404");

  const { user, video } = videoData;

  return (
    <main className="wrapper page">
      <VideoDetailHeader
        title={video.title}
        createdAt={video.createdAt}
        userImg={user?.image}
        username={user?.name}
        videoId={video.videoId}
        ownerId={video.userId}
        visibility={video.visibility}
        thumbnailUrl={video.thumbnailUrl}
        publicVideoId={video.publicVideoId ?? undefined}
      />

      <section className="video-details">
        <div className="content">
          <VideoPlayer videoId={video.videoId} videoUrl={video.videoUrl} duration={video.duration ?? 0} />
        </div>

        <VideoInfo
          title={video.title}
          createdAt={video.createdAt}
          description={video.description}
          videoId={videoId}
          videoUrl={video.videoUrl}
        />
      </section>
    </main>
  );
};

export default page;
