'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoTranscript } from "@/components/video-transcript";
import { VideoSummary } from "@/components/video-summary";
import { Video, Share2, Download, ExternalLink, Subtitles, BarChart4, FileText } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface VideoHeaderProps {
  videoData: VideoData;
  onReprocess?: () => void;
}

export function VideoHeader({ videoData, onReprocess }: VideoHeaderProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: videoData.title,
        text: `Check out this video: ${videoData.title}`,
        url: window.location.href,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleDownloadTranscript = () => {
    const transcript = videoData.transcript[videoData.language as keyof typeof videoData.transcript]?.full || "";
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoData.title.replace(/\s+/g, "_")}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <motion.div 
      className={`grid grid-cols-1 gap-6 ${isFullScreen ? 'fixed inset-0 z-50 p-4 bg-background/95 overflow-auto' : ''}`}
      layout
      transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
    >
      <Card className="p-6 border border-border/40 bg-card shadow-sm rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">{videoData.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Language: <span className="font-medium text-foreground">{videoData.language}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-1 hover:bg-primary/5 transition-colors" 
                    onClick={toggleFullScreen}
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span>{isFullScreen ? "Exit" : "Expand"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullScreen ? "Exit fullscreen" : "View fullscreen"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-1 hover:bg-primary/5 transition-colors" 
                    onClick={handleDownloadTranscript}
                  >
                    <Download className="h-4 w-4 text-primary" />
                    <span>Transcript</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download transcript</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-1 hover:bg-primary/5 transition-colors" 
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 text-primary" />
                    <span>Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share this video</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="mb-6 rounded-lg overflow-hidden bg-black aspect-video relative">
          <video 
            src={videoData.videoURL} 
            className="w-full h-full object-contain" 
            controls 
            poster="/video-placeholder.jpg"
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-4">
            <TabsTrigger 
              value="summary" 
              className="flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <BarChart4 className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transcript" 
              className="flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <FileText className="h-4 w-4" />
              <span>Transcript</span>
            </TabsTrigger>
          </TabsList>
          
          <AnimatePresence mode="wait">
            <TabsContent 
              value="summary" 
              className="mt-0"
              asChild
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VideoSummary videoData={videoData} />
              </motion.div>
            </TabsContent>
            
            <TabsContent 
              value="transcript" 
              className="mt-0"
              asChild
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VideoTranscript videoData={videoData} onReprocess={onReprocess} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </Card>
    </motion.div>
  );
} 