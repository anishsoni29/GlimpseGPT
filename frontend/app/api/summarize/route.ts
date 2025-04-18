import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  try {
    const { url, file, language = 'English' } = await req.json();

    if (!url && !file) {
      return NextResponse.json(
        { error: 'Video URL or file is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const apiEndpoint = `${BACKEND_URL}/api/summarize`;
    
    // Set up request body
    const requestBody: any = {};
    if (url) requestBody.url = url;
    if (file) requestBody.file = file;
    requestBody.language = language;

    const backendResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || 'Failed to process video');
    }

    const responseData = await backendResponse.json();
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
}