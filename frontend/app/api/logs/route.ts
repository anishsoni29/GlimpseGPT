import { NextResponse } from 'next/server';

// Function to fetch logs from the backend server
export async function GET() {
  try {
    // Get the backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    
    // Fetch logs from the backend
    const response = await fetch(`${backendUrl}/api/logs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: `Failed to fetch logs from backend: ${error}`, 
        logs: [] 
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching backend logs:', error);
    // Return empty logs array in case of error
    return NextResponse.json({ 
      error: `Failed to connect to backend: ${error instanceof Error ? error.message : String(error)}`,
      logs: [] 
    }, { status: 500 });
  }
} 