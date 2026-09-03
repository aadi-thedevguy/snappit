import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  downloadUrl: string;
};

function PublicVideoDownloadButton({ downloadUrl }: Props) {
  return (
    <Button className="w-full sm:w-auto" asChild>
      <a href={downloadUrl}>
        <Download className="h-4 w-4" />
        Download
      </a>
    </Button>
  );
}

export default PublicVideoDownloadButton;
