declare interface VideoDetailHeaderProps {
  title: string;
  userImg: string | null | undefined;
  username?: string;
  videoId: string;
  publicVideoId?: string;
  createdAt: Date;
  views: number;
}

declare interface VideoInfoProps {
  title: string;
  createdAt: Date;
  description: string;
  videoId: string;
  duration: number;
  shareable?: boolean;
}

declare interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  fallback?: string;
  alt: string;
  src: string | null;
}

declare interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  thumbnailId: string;
  visibility: Visibility;
  duration?: number | null;
}

declare interface Params {
  params: Promise<Record<string, string>>;
}

declare interface SearchParams {
  searchParams: Promise<Record<string, string | undefined>>;
}

declare interface ParamsWithSearch {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | undefined>>;
}

declare interface PendingUpload {
  blob: Blob;
  duration: number;
}
