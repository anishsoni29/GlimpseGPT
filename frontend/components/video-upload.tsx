'use client';

import { useState, useEffect, useCallback, useRef } from "react";
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
const WS_URL = BACKEND_URL.replace('http', 'ws');

export function VideoUpload() {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | "warning" | "loading" | "default">("default");
  const wsRef = useRef<WebSocket | null>(null);

  // Progress mapping for backend steps
  const progressMap = {
    "Downloading": 20,
    "Transcribing": 40,
    "Generating summary": 70,
    "Translating": 85,
    "Sentiment analysis": 90,
    "Finalizing": 95
  };

  const logProcessingEvent = (message: string) => {
    console.log(`Processing: ${message}`);
    // Emit a custom event for the processing logs component
    const event = new CustomEvent('processingLog', { detail: message });
    window.dispatchEvent(event);
    
    // Update status message based on the log
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("download")) {
      setStatusMessage("Downloading...");
    } else if (lowerMessage.includes("transcrib")) {
      setStatusMessage("Transcribing...");
    } else if (lowerMessage.includes("summary")) {
      setStatusMessage("Generating summary...");
    } else if (lowerMessage.includes("translat")) {
      setStatusMessage("Translating...");
    } else if (lowerMessage.includes("sentiment")) {
      setStatusMessage("Analyzing sentiment...");
    } else if (lowerMessage.includes("finaliz")) {
      setStatusMessage("Finalizing...");
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const getReconnectDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000);
    
    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        return;
      }
      
      const ws = new WebSocket(`${WS_URL}/ws/logs`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0; // Reset attempts on successful connection
      };
      
      ws.onmessage = (event) => {
        if (!isProcessing) return;
        
        try {
          const data = JSON.parse(event.data);
          const message = data.message.toLowerCase();
          
          // Always increment progress slightly for any log message to show activity
          setProgress(prev => Math.min(prev + 0.5, 95));
          
          // Update progress based on log message content
          if (message.includes("download") && progress < progressMap["Downloading"]) {
            setProgress(progressMap["Downloading"]);
            setStatusMessage("Downloading...");
          } else if (message.includes("transcrib") && progress < progressMap["Transcribing"]) {
            setProgress(progressMap["Transcribing"]);
            setStatusMessage("Transcribing...");
          } else if (message.includes("summary") && progress < progressMap["Generating summary"]) {
            setProgress(progressMap["Generating summary"]);
            setStatusMessage("Generating summary...");
          } else if (message.includes("translat") && progress < progressMap["Translating"]) {
            setProgress(progressMap["Translating"]);
            setStatusMessage("Translating...");
          } else if (message.includes("sentiment") && progress < progressMap["Sentiment analysis"]) {
            setProgress(progressMap["Sentiment analysis"]);
            setStatusMessage("Analyzing sentiment...");
          } else if (message.includes("finaliz") && progress < progressMap["Finalizing"]) {
            setProgress(progressMap["Finalizing"]);
            setStatusMessage("Finalizing...");
          }
          
          // Emit a custom event for the processing logs component
          const customEvent = new CustomEvent('processingLog', { detail: data.message });
          window.dispatchEvent(customEvent);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected. Attempting to reconnect...');
        const reconnectDelay = getReconnectDelay(reconnectAttempts);
        reconnectAttempts++;
        
        if (reconnectAttempts < maxReconnectAttempts) {
          console.log(`Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          setTimeout(connectWebSocket, reconnectDelay);
        } else {
          console.log('Max reconnection attempts reached');
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't attempt to reconnect here, let onclose handle it
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isProcessing, progress]);

  // Auto increment progress to avoid stagnant progress bar
  useEffect(() => {
    let incrementTimer: NodeJS.Timeout | null = null;
    
    if (isProcessing && progress < 95) {
      // Create timer that gently increases progress to show activity
      incrementTimer = setInterval(() => {
        setProgress(prev => {
          // Smaller increments as we get closer to completion
          const increment = Math.max(0.2, (95 - prev) / 50);
          return Math.min(prev + increment, 95);
        });
      }, 1000);
    }
    
    return () => {
      if (incrementTimer) clearInterval(incrementTimer);
    };
  }, [isProcessing, progress]);

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

  // Function to process API response and validate summary
  const processApiResponse = (data: any) => {
    // Validate that we actually have a summary
    if (!data.summary_translated || data.summary_translated.trim() === '') {
      logProcessingEvent("Warning: Received empty summary from API");
      
      // Try to regenerate the summary if needed
      if (data.original_text && data.original_text.trim().length > 0) {
        logProcessingEvent("Attempting to create a fallback summary from transcript...");
        // Use the first few sentences as a basic summary if API didn't provide one
        const sentences = data.original_text.split('. ');
        const fallbackSummary = sentences.slice(0, 3).join('. ') + '.';
        data.summary_translated = fallbackSummary;
        data.summary_en = fallbackSummary;
        logProcessingEvent("Created fallback summary from transcript");
      } else {
        logProcessingEvent("Error: No valid summary or transcript content available");
        throw new Error("Failed to generate summary - no valid content found in the video");
      }
    }
    
    // Transform raw transcript into segments with timestamps if they don't exist
    if (data.original_text && !data.transcript_segments) {
      const approximateSegmentLength = 120; // characters
      const text = data.original_text;
      const textLength = text.length;
      const segments = [];
      let segmentCount = Math.ceil(textLength / approximateSegmentLength);
      
      // Create roughly equal segments with approximated timestamps
      for (let i = 0; i < segmentCount; i++) {
        const start = Math.floor((i / segmentCount) * 600); // Assuming 10 minutes total for calculation
        const end = Math.floor(((i + 1) / segmentCount) * 600);
        const startIdx = Math.floor((i / segmentCount) * textLength);
        const endIdx = i === segmentCount - 1 
          ? textLength 
          : Math.floor(((i + 1) / segmentCount) * textLength);
          
        // Find sentence boundary if possible
        let segmentEndIdx = endIdx;
        if (i < segmentCount - 1) {
          const nextPeriod = text.indexOf('. ', startIdx, endIdx + 20);
          if (nextPeriod > startIdx && nextPeriod < endIdx + 20) {
            segmentEndIdx = nextPeriod + 1;
          }
        }
        
        segments.push({
          text: text.substring(startIdx, segmentEndIdx).trim(),
          start,
          end
        });
      }
      
      data.transcript_segments = segments;
    }
    
    return data;
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
    setProgress(5);  // Initial progress
    setStatusMessage("Starting processing...");
    logProcessingEvent("Starting video processing...");

    try {
      // Add to history
      addToHistory(standardUrl, youtubeId, language);

      // API request
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: standardUrl, language, include_timestamps: true }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text() || "Failed to process video");
      }

      const data = await response.json();
      
      // Process and validate the API response
      const processedData = processApiResponse(data);
      
      setProgress(100);
      logProcessingEvent("Processing complete!");
      
      // Save and broadcast results
      localStorage.setItem('summaryData', JSON.stringify(processedData));
      window.dispatchEvent(new CustomEvent('summaryUpdated', { detail: processedData }));
      
      toast({ title: "Processing complete" });
    } catch (error) {
      logProcessingEvent(`Error: ${error instanceof Error ? error.message : "Failed to process video"}`);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process video",
        variant: "destructive",
      });
    } finally {
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
    setProgress(5);  // Initial progress
    setStatusMessage("Starting processing...");
    logProcessingEvent(`Processing file: ${audioFile.name}`);
    
    try {
      // Prepare form data and update history
      const language = localStorage.getItem('preferredLanguage') || 'English';
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('language', language);
      formData.append('include_timestamps', 'true');
      
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
      
      // Process and validate the API response
      const processedData = processApiResponse(data);
      
      setProgress(100);
      logProcessingEvent("Processing complete!");
      
      // Save and broadcast result
      localStorage.setItem('summaryData', JSON.stringify(processedData));
      window.dispatchEvent(new CustomEvent('summaryUpdated', { detail: processedData }));
      
      toast({ title: "Processing complete" });
    } catch (error) {
      logProcessingEvent(`Error: ${error instanceof Error ? error.message : "Failed to process file"}`);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
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
            <span className="animate-pulse">{statusMessage}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-1.5 transition-all duration-300 ease-in-out overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 animate-pulse"></div>
          </Progress>
        </div>
      )}
    </Card>
  );
}