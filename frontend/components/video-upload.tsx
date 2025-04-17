'use client';

import { useState, useEffect } from "react";
import { Upload, X, FileAudio, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid';

// Define backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function VideoUpload() {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Validate YouTube URL
  const isValidYoutubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(.*)$/;
    return youtubeRegex.test(url);
  };

  // Extract YouTube ID from URL
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Function to add video to history
  const addToHistory = (videoUrl: string, videoId: string, language: string) => {
    try {
      const historyItem = {
        id: uuidv4(),
        title: `YouTube Video ${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: videoUrl,
        timestamp: Date.now(),
        language: language
      };
      
      // Get existing history
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
    } catch (error) {
      console.error('Failed to save to history', error);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a video URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidYoutubeUrl(url)) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    // Get the YouTube ID and convert to a standard URL format
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) {
      toast({
        title: "Error",
        description: "Could not extract valid YouTube video ID",
        variant: "destructive",
      });
      return;
    }

    const standardUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const language = localStorage.getItem('preferredLanguage') || 'English';

    setIsProcessing(true);
    setProgress(0);
    let progressInterval: NodeJS.Timeout | undefined = undefined;

    try {
      // Start progress animation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          // Only increase up to 90% during processing
          if (prev < 90) return prev + 5;
          return prev;
        });
      }, 500);

      // Create a properly formatted request body
      const requestData = {
        url: standardUrl,
        language
      };

      // Add to history before processing
      addToHistory(standardUrl, youtubeId, language);

      // Use URLSearchParams for file-less requests
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
      });
      
      if (progressInterval) clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to process video';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If not valid JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Ensure progress completes to 100%
      setProgress(100);
      
      // Save response data to localStorage
      localStorage.setItem('summaryData', JSON.stringify(data));
      
      // Trigger custom storage event for components that need to react to this change
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'summaryData',
        newValue: JSON.stringify(data)
      }));
      
      // Also dispatch a custom event for direct component communication
      const customEvent = new CustomEvent('summaryUpdated', { detail: data });
      window.dispatchEvent(customEvent);
      
      toast({
        title: "Success",
        description: "Video processed successfully",
      });
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      setProgress(0);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process video",
        variant: "destructive",
      });
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
      // Only reset progress after a delay if it completed successfully
      if (progress === 100) {
        setTimeout(() => setProgress(0), 1000);
      }
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
    
    if (audioFile) {
      setIsProcessing(true);
      setProgress(0);
      let progressInterval: NodeJS.Timeout | undefined = undefined;
      
      try {
        progressInterval = setInterval(() => {
          setProgress(prev => {
            // Only increase up to 90% during processing
            if (prev < 90) return prev + 5;
            return prev;
          });
        }, 500);
        
        const language = localStorage.getItem('preferredLanguage') || 'English';
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('language', language);
        
        // Add to history with local file
        const fileId = uuidv4();
        const historyItem = {
          id: fileId,
          title: audioFile.name || 'Uploaded file',
          thumbnailUrl: '',  // No thumbnail for local files
          url: `file-${fileId}`,  // We can't reuse the actual file
          timestamp: Date.now(),
          language
        };
        
        // Get existing history
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
        localStorage.setItem('videoHistory', JSON.stringify(history));
        
        const response = await fetch(`${BACKEND_URL}/api/summarize`, {
          method: 'POST',
          body: formData,
        });
        
        if (progressInterval) clearInterval(progressInterval);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to process file';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch {
            // If not valid JSON, use the raw text
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Ensure progress completes to 100%
        setProgress(100);
        
        // Save response data to localStorage
        localStorage.setItem('summaryData', JSON.stringify(data));
        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'summaryData',
          newValue: JSON.stringify(data)
        }));
        
        // Also dispatch a custom event for direct component communication
        const customEvent = new CustomEvent('summaryUpdated', { detail: data });
        window.dispatchEvent(customEvent);
        
        toast({
          title: "Success",
          description: "File processed successfully",
        });
      } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        setProgress(0);
        console.error('File processing error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        // Only reset progress after a delay if it completed successfully
        if (progress === 100) {
          setTimeout(() => setProgress(0), 1000);
        }
      }
    } else {
      toast({
        title: "Error",
        description: "Please upload an audio or video file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-card">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Upload Media</h3>
        <p className="text-muted-foreground">
          Enter a YouTube URL or upload an audio/video file
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="pl-10 bg-background"
            />
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          <Button 
            type="submit" 
            disabled={isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? "Processing..." : "Process"}
          </Button>
        </div>

        <motion.div
          className={`border-2 border-dashed rounded-xl p-10 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <FileAudio className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Drag and drop your audio or video file
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports MP3, WAV, MP4, and more
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Processing media...</span>
                <span className="text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Card>
  );
}