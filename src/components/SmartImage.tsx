import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  /** Smaller variant used for narrow viewports / card grids. */
  thumbSrc?: string | null;
  thumbWidth?: number;
  width: number;
  height: number;
  /** `sizes` attribute — helps the browser pick the lightest variant. */
  sizes?: string;
  /** Only for the single above-the-fold hero image of a page. */
  priority?: boolean;
  className?: string;
};

/**
 * Image wrapper with lazy loading, async decoding, reserved space (no layout
 * shift) and a responsive srcSet when a lighter thumbnail is available.
 */
export function SmartImage({
  src,
  alt,
  thumbSrc,
  thumbWidth = 600,
  width,
  height,
  sizes = "(max-width: 640px) 100vw, 400px",
  priority = false,
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  const srcSet =
    thumbSrc && thumbSrc !== src
      ? `${thumbSrc} ${thumbWidth}w, ${src} ${width}w`
      : undefined;

  return (
    <img
      src={thumbSrc && !srcSet ? thumbSrc : src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "low"}
      onLoad={() => setLoaded(true)}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
