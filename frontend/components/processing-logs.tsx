'use client';

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ProcessingLogsProps {
  messages: string[];
}

export function ProcessingLogs({ messages }: ProcessingLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to format log messages with appropriate icons and styles
  const formatMessage = (message: string, index: number) => {
    let icon = <Info className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    let badgeText = "Info";
    let badgeVariant = "default";
    
    if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
      icon = <AlertCircle className="h-4 w-4 text-destructive mr-2 flex-shrink-0" />;
      badgeText = "Error";
      badgeVariant = "destructive";
    } else if (message.toLowerCase().includes('complete') || message.toLowerCase().includes('success')) {
      icon = <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />;
      badgeText = "Success";
      badgeVariant = "success";
    } else if (message.toLowerCase().includes('progress') || message.toLowerCase().includes('downloading') || 
               message.toLowerCase().includes('transcribing') || message.toLowerCase().includes('generating')) {
      icon = <Loader2 className="h-4 w-4 text-muted-foreground mr-2 animate-spin flex-shrink-0" />;
      badgeText = "Processing";
      badgeVariant = "secondary";
    }
    
    return (
      <div key={index} className="flex items-start py-1.5 border-b border-border/50 last:border-0 group">
        <div className="flex items-center mr-2">
          {icon}
        </div>
        <div className="flex-1 text-sm">
          {message}
        </div>
        <Badge variant={badgeVariant as any} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {badgeText}
        </Badge>
      </div>
    );
  };
  
  // Get the current processing status
  const getProcessingStatus = () => {
    const lastMessage = messages[messages.length - 1]?.toLowerCase() || '';
    
    if (lastMessage.includes('error') || lastMessage.includes('failed')) {
      return "error";
    } else if (lastMessage.includes('complete') || lastMessage.includes('success')) {
      return "complete";
    } else {
      return "processing";
    }
  };
  
  const status = getProcessingStatus();
  
  return (
    <Card className="border overflow-hidden">
      <div className="bg-muted/40 p-3 border-b flex items-center justify-between">
        <div className="font-medium text-sm flex items-center">
          {status === "processing" && <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />}
          {status === "error" && <AlertCircle className="h-4 w-4 mr-2 text-destructive" />}
          {status === "complete" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
          Processing Logs
        </div>
        <Badge variant={
          status === "processing" ? "secondary" : 
          status === "error" ? "destructive" : 
          "success"
        }>
          {status === "processing" ? "Processing" : 
           status === "error" ? "Error" : 
           "Complete"}
        </Badge>
      </div>
      <ScrollArea className="h-[200px] p-2" ref={scrollRef}>
        <div className="space-y-0.5 p-2">
          {messages.map((message, index) => formatMessage(message, index))}
          
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-[150px] text-muted-foreground">
              No processing logs yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
} 