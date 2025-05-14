'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Info, Terminal, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const WS_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace('http', 'ws');

interface ProcessingLogsProps {
  messages: string[];
}

export function ProcessingLogs({ messages: initialMessages }: ProcessingLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>(initialMessages);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend'>('backend');
  
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

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/logs`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsLoading(false);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setBackendLogs(prev => {
            const newLogs = [...prev, data.message];
            // Keep only the last 100 logs to prevent memory issues
            if (newLogs.length > 100) {
              return newLogs.slice(-100);
            }
            return newLogs;
          });
          
          // Dispatch the event so it can be picked up by other components
          const customEvent = new CustomEvent('processingLog', { detail: data.message });
          window.dispatchEvent(customEvent);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting...');
        setTimeout(connectWebSocket, 1000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsLoading(true);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Function to manually refresh connection
  const refreshConnection = () => {
    setIsLoading(true);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

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
            onClick={refreshConnection}
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
          {activeTab === 'frontend' ? 
            messages.map((msg, i) => formatMessage(msg, i, 'frontend')) :
            backendLogs.map((msg, i) => formatMessage(msg, i, 'backend'))
          }
        </div>
      </ScrollArea>
    </Card>
  );
} 