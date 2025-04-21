'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Info, Terminal, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProcessingLogsProps {
  messages: string[];
}

export function ProcessingLogs({ messages: initialMessages }: ProcessingLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<string[]>(initialMessages);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend'>('backend'); // Default to backend logs
  
  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, backendLogs]);

  // Update local messages when props change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Function to fetch logs from backend
  const fetchBackendLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.logs)) {
          // Check if we have new logs
          const hasNewLogs = data.logs.length > backendLogs.length;
          setBackendLogs(data.logs);
          
          // If there are backend logs, dispatch them as events to be picked up by the frontend
          if (data.logs.length > 0 && hasNewLogs) {
            // Get the last message that hasn't been seen in frontend logs
            const lastMessage = data.logs[data.logs.length - 1];
            // Dispatch the event so it can be picked up by the app
            const event = new CustomEvent('processingLog', { detail: lastMessage });
            window.dispatchEvent(event);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch backend logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling for backend logs
  useEffect(() => {
    fetchBackendLogs();
    const interval = setInterval(fetchBackendLogs, 1000); // Poll every second for more responsive updates
    
    return () => clearInterval(interval);
  }, []);

  // Function to format log messages with appropriate icons and styles
  const formatMessage = (message: string, index: number, source: 'frontend' | 'backend') => {
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
    
    if (source === 'backend') {
      // Customize icon based on backend log content
      if (message.toLowerCase().includes('download')) {
        icon = <Terminal className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />;
        badgeText = "Download";
      } else if (message.toLowerCase().includes('transcrib')) {
        icon = <Terminal className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />;
        badgeText = "Transcribe";
      } else if (message.toLowerCase().includes('generat') || message.toLowerCase().includes('summar')) {
        icon = <Terminal className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />;
        badgeText = "Summarize";
      } else {
        icon = <Terminal className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />;
        badgeText = "Backend";
      }
      badgeVariant = "outline";
    }
    
    return (
      <div key={`${source}-${index}`} className="flex items-start py-1.5 border-b border-border/50 last:border-0 group hover:bg-muted/30 px-2 rounded transition-colors">
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
    // Check both frontend and backend logs for status
    const lastFrontendMessage = messages[messages.length - 1]?.toLowerCase() || '';
    const lastBackendMessage = backendLogs[backendLogs.length - 1]?.toLowerCase() || '';
    
    // First check for errors
    if (lastFrontendMessage.includes('error') || lastFrontendMessage.includes('failed') ||
        lastBackendMessage.includes('error') || lastBackendMessage.includes('failed')) {
      return "error";
    } 
    
    // Then check for completion
    if ((lastFrontendMessage.includes('complete') || lastFrontendMessage.includes('success') ||
        lastBackendMessage.includes('complete') || lastBackendMessage.includes('success')) &&
        !lastBackendMessage.includes('progress')) {
      return "complete";
    }
    
    // Otherwise assume processing
    return "processing";
  };
  
  const status = getProcessingStatus();
  
  return (
    <Card className="border border-border/40 overflow-hidden shadow-md rounded-xl">
      <div className="bg-muted/40 p-3 border-b border-border/30 flex items-center justify-between">
        <div className="font-medium text-sm flex items-center">
          {status === "processing" && <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />}
          {status === "error" && <AlertCircle className="h-4 w-4 mr-2 text-destructive" />}
          {status === "complete" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
          Processing Logs
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="outline" 
            className="h-7 w-7 border border-border/40" 
            onClick={fetchBackendLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
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
      </div>
      
      <div className="flex px-3 py-1.5 border-b border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs rounded-none border-b-2 px-3 py-1 ${activeTab === 'frontend' ? 'border-primary' : 'border-transparent'}`}
          onClick={() => setActiveTab('frontend')}
        >
          Frontend Logs ({messages.length})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs rounded-none border-b-2 px-3 py-1 ${activeTab === 'backend' ? 'border-blue-500' : 'border-transparent'}`}
          onClick={() => setActiveTab('backend')}
        >
          Backend Logs ({backendLogs.length})
        </Button>
      </div>
      
      <ScrollArea className="h-[160px] p-2 bg-card/30" ref={scrollRef}>
        <div className="space-y-0.5 p-2">
          {activeTab === 'frontend' ? (
            messages.length > 0 ? 
              messages.map((message, index) => formatMessage(message, index, 'frontend')) :
              <div className="flex items-center justify-center h-[120px] text-muted-foreground">
                No frontend logs yet.
              </div>
          ) : (
            backendLogs.length > 0 ?
              backendLogs.map((message, index) => formatMessage(message, index, 'backend')) :
              <div className="flex items-center justify-center h-[120px] text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Waiting for backend logs...
              </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
} 