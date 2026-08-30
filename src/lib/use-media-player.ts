"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMediaPlayer(mediaUrl?: string, fallbackDuration = 105) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [playing, setPlaying] = useState(false);

  const stopFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopFallbackTimer();
    if (!mediaUrl) {
      audioRef.current = null;
      setDuration(fallbackDuration);
      setCurrentTime(0);
      setPlaying(false);
      return;
    }

    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.ceil(audio.duration));
      }
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [mediaUrl, fallbackDuration, stopFallbackTimer]);

  useEffect(() => () => stopFallbackTimer(), [stopFallbackTimer]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        void audio.play();
        setPlaying(true);
      }
      return;
    }

    if (playing) {
      stopFallbackTimer();
      setPlaying(false);
      return;
    }

    setPlaying(true);
    fallbackTimerRef.current = setInterval(() => {
      setCurrentTime((t) => {
        if (t + 1 >= duration) {
          stopFallbackTimer();
          setPlaying(false);
          return duration;
        }
        return t + 1;
      });
    }, 1000);
  }, [playing, duration, stopFallbackTimer]);

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      const next = Math.min(duration, Math.max(0, seconds));
      if (audio) {
        audio.currentTime = next;
      }
      setCurrentTime(next);
    },
    [duration],
  );

  return { currentTime, duration, playing, togglePlay, seekTo };
}
