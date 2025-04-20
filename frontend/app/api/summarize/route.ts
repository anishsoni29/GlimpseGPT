import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let backendRequestBody: any;
    
    if (contentType.includes('application/json')) {
      const requestBody = await req.json();
      if (!requestBody.url && !requestBody.file) {
        return NextResponse.json({ error: 'Video URL or file is required' }, { status: 400 });
      }
      backendRequestBody = { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      };
    } else if (contentType.includes('multipart/form-data') || contentType.includes('boundary=')) {
      backendRequestBody = { method: 'POST', body: await req.formData() };
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/summarize`, backendRequestBody);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        errorMessage = JSON.parse(errorText).detail;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(errorMessage || 'Failed to process request');
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}