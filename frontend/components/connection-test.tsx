'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Define backend URL - keep consistent with video-upload component
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function ConnectionTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    setIsLoading(true);
    setIsConnected(null);
    
    try {
      console.log(`Testing connection to: ${BACKEND_URL}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        toast({
          title: "Connection Successful",
          description: data.message || "Backend is connected",
        });
      } else {
        setIsConnected(false);
        toast({
          title: "Connection Failed",
          description: `Backend returned error status: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsConnected(false);
      let errorMessage = "Failed to reach the backend server";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Connection timed out. Is the backend running?";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error("Connection test error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <Button 
        onClick={testConnection}
        variant="outline"
        className="relative"
        disabled={isLoading}
      >
        {isLoading ? "Testing..." : "Test Backend Connection"}
        {isConnected !== null && (
          <span 
            className={`absolute -right-2 -top-2 w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        )}
      </Button>
    </div>
  );
} 