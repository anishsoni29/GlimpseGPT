import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const language = formData.get('language') || 'English';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Forward the form data to the backend API
    const apiEndpoint = `${BACKEND_URL}/api/summarize`;
    
    // Create a new FormData object to send to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('language', language as string);

    const backendResponse = await fetch(apiEndpoint, {
      method: 'POST',
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || 'Failed to process file');
    }

    const responseData = await backendResponse.json();
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
} 