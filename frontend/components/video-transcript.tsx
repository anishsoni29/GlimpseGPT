'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCw, Languages } from "lucide-react";

type VideoData = {
  title: string;
  summary: {
    english: string;
    hindi?: string;
    marathi?: string;
    tamil?: string;
  };
  transcript: {
    english: {
      full: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
    hindi?: {
      full: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
    marathi?: {
      full: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
    tamil?: {
      full: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
  };
  videoURL: string;
  isProcessing?: boolean;
  language: string;
};

interface VideoTranscriptProps {
  videoData: VideoData;
  onReprocess?: () => void;
}

export function VideoTranscript({ videoData, onReprocess }: VideoTranscriptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const language = videoData.language as keyof typeof videoData.transcript;
  const transcriptData = videoData.transcript[language];
  
  if (!transcriptData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-lg font-medium mb-4">No transcript available for {language}</div>
        {onReprocess && (
          <Button 
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              onReprocess?.();
              setTimeout(() => setIsLoading(false), 2000);
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            <span>Reprocess Video</span>
          </Button>
        )}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (startTime: number) => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.currentTime = startTime;
      videoElement.play().catch(error => console.error("Error playing video:", error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          Transcript
          <span className="text-sm font-normal text-muted-foreground">({language})</span>
        </h3>
        {onReprocess && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              onReprocess?.();
              setTimeout(() => setIsLoading(false), 2000);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            {isLoading ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>Reprocess</span>
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        {transcriptData.segments.map((segment, index) => (
          <div
            key={index}
            className="mb-4 last:mb-0 opacity-100"
          >
            <div 
              className="flex gap-3 group cursor-pointer hover:bg-primary/5 p-2 rounded-md transition-colors"
              onClick={() => handleSegmentClick(segment.start)}
            >
              <div className="text-xs font-medium text-primary shrink-0 pt-1">
                {formatTime(segment.start)}
              </div>
              <div className="text-sm">{segment.text}</div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
} 