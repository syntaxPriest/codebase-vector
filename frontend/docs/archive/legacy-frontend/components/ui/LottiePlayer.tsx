"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

interface LottiePlayerProps {
  /** Public path to the Lottie JSON (e.g. /lottie/loading.json). */
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

// Thin wrapper around lottie-react that fetches the JSON at mount and
// keeps the bundle out of the SSR path. Renders nothing until the
// animation data has loaded so we don't ship a huge inline blob.
export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  className,
  style,
  ariaLabel,
}: LottiePlayerProps) {
  const [data, setData] = useState<unknown>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src]);

  if (failed) return null;
  if (!data) {
    // Reserve space so the layout doesn't jump when the animation lands.
    return <div className={className} style={style} aria-hidden />;
  }
  return (
    <div className={className} style={style} role="img" aria-label={ariaLabel}>
      <Lottie animationData={data} loop={loop} autoplay={autoplay} />
    </div>
  );
}
