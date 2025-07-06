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
        publicVideoId={video.publicVideoId ?? ""}
        ownerId={video.userId}
        visibility={video.visibility}
        thumbnailUrl={video.thumbnailUrl}
      />

      <section className="video-details">
        <div className="content">
          <VideoPlayer videoId={video.videoId} videoUrl={video.videoUrl} />
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
