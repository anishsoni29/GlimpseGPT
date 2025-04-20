import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  try {
    // Check content type
    const contentType = req.headers.get('content-type') || '';
    
    let backendRequestBody: any = null;
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      // Parse JSON request
      const requestBody = await req.json();
      const { url, file, language = 'English' } = requestBody;
      
      if (!url && !file) {
        return NextResponse.json(
          { error: 'Video URL or file is required' },
          { status: 400 }
        );
      }
      
      // Prepare backend request body
      backendRequestBody = { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      };
    } else if (contentType.includes('multipart/form-data') || contentType.includes('boundary=')) {
      // Handle FormData (file upload)
      try {
        const formData = await req.formData();
        
        // Forward the form data directly
        backendRequestBody = {
          method: 'POST',
          // Don't set Content-Type as fetch will set it with the boundary
          body: formData
        };
      } catch (error) {
        console.error('Error parsing form data:', error);
        return NextResponse.json(
          { error: 'Failed to parse form data' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported content type: ${contentType}` },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const apiEndpoint = `${BACKEND_URL}/api/summarize`;
    
    try {
      const backendResponse = await fetch(apiEndpoint, backendRequestBody);

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'Failed to process request' };
        }
        
        throw new Error(errorData.detail || 'Failed to process video');
      }

      const responseData = await backendResponse.json();
      return NextResponse.json(responseData);
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: fetchError instanceof Error ? fetchError.message : 'Failed to connect to backend service' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
}