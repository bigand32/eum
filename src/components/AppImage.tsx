"use client";

import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "alt"> & {
  alt: string;
  /** 외부 URL이거나 data/blob 이면 일반 img로 폴백 */
  unoptimizedFallback?: boolean;
};

function shouldUnoptimize(src: ImageProps["src"]) {
  if (typeof src !== "string") return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (src.startsWith("/")) return false;
  return false;
}

/** 핫패스 이미지 — next/image + remote 최적화, data/blob은 폴백 */
export function AppImage({
  alt,
  className,
  unoptimizedFallback,
  src,
  ...rest
}: Props) {
  const unoptimized =
    unoptimizedFallback || shouldUnoptimize(src) || Boolean(rest.unoptimized);

  if (typeof src === "string" && (src.startsWith("data:") || src.startsWith("blob:"))) {
    // next/image는 data URL 제한이 있어 네이티브 img 사용
    const { fill, width, height, ...imgRest } = rest as ImageProps & {
      fill?: boolean;
      width?: number;
      height?: number;
    };
    void fill;
    void imgRest;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      unoptimized={unoptimized}
      {...rest}
    />
  );
}
