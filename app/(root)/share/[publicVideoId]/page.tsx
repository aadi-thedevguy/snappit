import { notFound } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import VideoInfo from "@/components/VideoInfo";
import { getVideoByPublicVideoId, generateSignedVideoUrl } from "@/lib/actions/video";
import PublicVideoDetail from "@/components/PublicVideoDetail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const revalidate = 60; // Cache this page for 60 seconds

const page = async ({ params }: Params) => {
  const { publicVideoId } = await params;

  const { data: videoData, error } =
    await getVideoByPublicVideoId(publicVideoId);
  if (!videoData || error) notFound();

  const { video } = videoData;
  if (!video) notFound();

  const initialSecureUrl = await generateSignedVideoUrl(video.videoId);
  const downloadSecureUrl = await generateSignedVideoUrl(video.videoId, {
    downloadFilename: video.title,
  });

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <Alert className="mb-6 border-amber-500/20 bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-4 w-4 stroke-amber-500" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>
            Snappit only keeps videos in the cloud for a month. Download this
            video if you want to keep it permanently.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <PublicVideoDetail
              video={video}
              downloadUrl={downloadSecureUrl}
            />

            <div className="rounded-xl overflow-hidden shadow-card bg-foreground/5">
              <VideoPlayer
                videoId={video.videoId}
                initialSecureUrl={initialSecureUrl}
                duration={video.duration ?? 0}
              />
            </div>
          </div>
          <VideoInfo
            title={video.title}
            createdAt={video.createdAt}
            description={video.description}
            videoId={video.videoId}
            duration={video.duration ?? 0}
          />
        </div>
      </section>
    </main>
  );
};

export default page;
