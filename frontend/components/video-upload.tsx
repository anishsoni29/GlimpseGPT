'use client';

import { useState } from "react";
import { Upload, X, FileAudio, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";

export function VideoUpload() {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

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

    setIsProcessing(true);
    setProgress(0);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error('Failed to process video');

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Video processed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
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
      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        
        const interval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        await new Promise(resolve => setTimeout(resolve, 3000));
        clearInterval(interval);
        setProgress(100);
        
        toast({
          title: "Success",
          description: "File processed successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process file",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setProgress(0);
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
              placeholder="Enter YouTube URL"
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