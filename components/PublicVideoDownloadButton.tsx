"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generatePublicVideoDownloadUrl } from "@/lib/actions/public-video";

type Props = {
  publicVideoId: string;
};

function PublicVideoDownloadButton({ publicVideoId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const result = await generatePublicVideoDownloadUrl(publicVideoId);

      if (result.error || !result.data) {
        toast.error(result.error ?? "Unable to prepare the download.");
        return;
      }

      window.location.assign(result.data.downloadUrl);
    } catch (error) {
      console.error("Public video download failed:", error);
      toast.error("Unable to prepare the download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      className="w-full sm:w-auto"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isDownloading ? "Preparing..." : "Download Video"}
    </Button>
  );
}

export default PublicVideoDownloadButton;
