'use client';

import { useState } from "react";
import { Upload, X, FileAudio, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";

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

      console.log("Sending request to", `${BACKEND_URL}/api/summarize`);
      
      // Create a properly formatted request body
      const requestData = {
        url: standardUrl,
        language: localStorage.getItem('preferredLanguage') || 'English'
      };
      
      console.log("Request body:", requestData);

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
        
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('language', localStorage.getItem('preferredLanguage') || 'English');
        
        console.log("Sending file upload to", `${BACKEND_URL}/api/summarize`);
        
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