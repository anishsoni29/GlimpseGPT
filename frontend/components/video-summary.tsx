'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowDownToLine, RefreshCw } from "lucide-react";
import { useState } from "react";

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

interface VideoSummaryProps {
  videoData: VideoData;
  onDownload?: () => void;
  onReprocess?: () => void;
}

export function VideoSummary({ videoData, onDownload, onReprocess }: VideoSummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const language = videoData.language as keyof typeof videoData.summary;
  const summaryText = videoData.summary[language];
  
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download functionality
      const element = document.createElement("a");
      const file = new Blob([videoData.summary[language] || "No summary available"], 
        { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${videoData.title.replace(/\s+/g, '_')}_summary_${language}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  if (!summaryText) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-lg font-medium mb-4">No summary available for {language}</div>
        {onReprocess && (
          <Button 
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              onReprocess();
              setTimeout(() => setIsLoading(false), 2000);
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Reprocess Video</span>
          </Button>
        )}
      </div>
    );
  }

  const paragraphs = summaryText.split('\n').filter(p => p.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Summary <span className="text-sm font-normal text-muted-foreground">({language})</span>
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1.5"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>Download</span>
          </Button>
          
          {onReprocess && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                onReprocess();
                setTimeout(() => setIsLoading(false), 2000);
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              {isLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Reprocess</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 bg-card text-card-foreground">
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
} 