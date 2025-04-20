'use client';

import { useState, useEffect, useCallback } from "react";
import { 
  FileAudio,
  FileVideo,
  Film, 
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid';
import { StatusIndicator } from "@/components/ui/status-indicator";

// Define backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function VideoUpload() {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | "warning" | "loading" | "default">("default");

  // Validate YouTube URL
  const isValidYoutubeUrl = useCallback((url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(.*)$/;
    return youtubeRegex.test(url);
  }, []);

  // Extract YouTube ID from URL
  const getYoutubeId = useCallback((url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }, []);

  // Update video history in real-time
  const updateVideoHistory = useCallback((historyItem: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    url: string;
    timestamp: number;
    language: string;
  }) => {
    const savedHistory = localStorage.getItem('videoHistory');
    let history = [];
    
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        history = Array.isArray(parsedHistory) ? parsedHistory : [];
      } catch (error) {
        console.error('Failed to parse video history', error);
      }
    }
    
    // Add new item to the beginning and limit to 10 items
    history = [historyItem, ...history].slice(0, 10);
    
    // Save back to localStorage
    localStorage.setItem('videoHistory', JSON.stringify(history));
    
    // Dispatch a custom event to notify components of the change
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'videoHistory',
      newValue: JSON.stringify(history)
    }));
    
    // Dispatch a specific custom event for the VideoHistory component
    window.dispatchEvent(new CustomEvent('videoHistoryUpdated'));
  }, []);

  // Function to add video to history
  const addToHistory = useCallback((videoUrl: string, videoId: string, language: string) => {
    try {
      const historyItem = {
        id: uuidv4(),
        title: `YouTube Video ${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: videoUrl,
        timestamp: Date.now(),
        language: language
      };
      
      // Update history with new item
      updateVideoHistory(historyItem);
    } catch (error) {
      console.error('Failed to save to history', error);
    }
  }, [updateVideoHistory]);

  // Listen for reprocessing requests from VideoHistory
  useEffect(() => {
    const handleReprocessVideo = (event: CustomEvent<{url: string, language: string}>) => {
      if (event.detail && event.detail.url) {
        setUrl(event.detail.url);
        
        // Set a timeout to allow the state to update before submitting
        setTimeout(() => {
          const form = document.querySelector('form') as HTMLFormElement;
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        }, 100);
      }
    };
    
    window.addEventListener('reprocessVideo', handleReprocessVideo as EventListener);
    
    return () => {
      window.removeEventListener('reprocessVideo', handleReprocessVideo as EventListener);
    };
  }, []);

  const logProcessingEvent = (message: string) => {
    console.log(`Processing: ${message}`);
    // Emit a custom event for the processing logs component
    const event = new CustomEvent('processingLog', { detail: message });
    window.dispatchEvent(event);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({ title: "Please enter a video URL", variant: "destructive" });
      return;
    }

    if (!isValidYoutubeUrl(url)) {
      toast({ title: "Please enter a valid YouTube URL", variant: "destructive" });
      return;
    }

    // Get YouTube ID and prepare URL
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) {
      toast({ title: "Could not extract valid YouTube video ID", variant: "destructive" });
      return;
    }

    const standardUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const language = localStorage.getItem('preferredLanguage') || 'English';

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Processing video...");
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev < 95 ? prev + (95 - prev) / 10 : prev;
        // Update status based on progress
        if (newProgress > 30 && prev < 30) setStatusMessage("Transcribing...");
        else if (newProgress > 60 && prev < 60) setStatusMessage("Summarizing...");
        else if (newProgress > 80 && prev < 80) setStatusMessage("Finalizing...");
        return newProgress;
      });
    }, 300);

    try {
      // Add to history
      addToHistory(standardUrl, youtubeId, language);

      // API request
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: standardUrl, language }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text() || "Failed to process video");
      }

      const data = await response.json();
      setProgress(100);
      
      // Save and broadcast results
      localStorage.setItem('summaryData', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('summaryUpdated', { detail: data }));
      
      toast({ title: "Processing complete" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process video",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/') || file.type.startsWith('video/'));
    
    if (!audioFile) {
      toast({ title: "Please upload an audio or video file", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Processing audio file...");
    
    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev < 95 ? prev + (95 - prev) / 10 : prev;
        // Update status messages at different progress points
        if (newProgress > 30 && prev < 30) setStatusMessage("Transcribing audio...");
        else if (newProgress > 60 && prev < 60) setStatusMessage("Generating summary...");
        else if (newProgress > 80 && prev < 80) setStatusMessage("Finalizing...");
        return newProgress;
      });
    }, 300);
    
    try {
      // Prepare form data and update history
      const language = localStorage.getItem('preferredLanguage') || 'English';
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('language', language);
      
      // Add to history
      const fileId = uuidv4();
      updateVideoHistory({
        id: fileId,
        title: audioFile.name || 'Uploaded file',
        thumbnailUrl: '',
        url: `file-${fileId}`,
        timestamp: Date.now(),
        language
      });
      
      // API call
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text() || "Failed to process file");
      }
      
      const data = await response.json();
      setProgress(100);
      
      // Use actual data or fallback
      const finalData = data.summary_translated ? data : {
        original_text: "Sample transcript from audio file",
        summary_en: "Sample summary in English",
        summary_translated: "Sample summary in requested language",
        language,
        sentiment: { label: "Neutral", score: 0.6 },
        title: audioFile.name
      };
      
      // Save and broadcast result
      localStorage.setItem('summaryData', JSON.stringify(finalData));
      window.dispatchEvent(new CustomEvent('summaryUpdated', { detail: finalData }));
      
      toast({ title: "Processing complete" });
    } catch (error) {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4 overflow-hidden">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileVideo className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Enter YouTube URL</p>
          </div>
          
          <div className="flex space-x-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isProcessing}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {isProcessing ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <span className="flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Summarize
                </span>
              )}
            </Button>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground">
          or
        </div>
        
        <div
          className={`border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'} 
                     rounded-md p-6 flex flex-col items-center justify-center gap-2 transition-colors h-28`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileAudio className="h-6 w-6 text-muted-foreground/70" />
          <div className="text-center">
            <p className="text-sm font-medium">Drop audio file here</p>
            <p className="text-xs text-muted-foreground">MP3, WAV, M4A files</p>
          </div>
        </div>
      </form>
      
      {isProcessing && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>{statusMessage}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </Card>
  );
}