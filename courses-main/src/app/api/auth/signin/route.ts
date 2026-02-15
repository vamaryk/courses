import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('[SIGNIN] Received signin request');
  
  try {
    const requestData = await request.json();
    console.log('[SIGNIN] Request data:', JSON.stringify(requestData, null, 2));
    
    const { email, password } = requestData;
    
    if (!email || !password) {
      const error = 'Email and password are required';
      console.error(`[SIGNIN] Validation error: ${error}`);
      return NextResponse.json(
        { error },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auth/signin`;
    console.log(`[SIGNIN] Calling backend URL: ${backendUrl}`);
    console.log(`[SIGNIN] Environment: ${process.env.NODE_ENV}`);
    console.log(`[SIGNIN] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    
    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));
      
      console.log(`[SIGNIN] Backend response status: ${response.status}`);
      console.log('[SIGNIN] Backend response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      console.log('[SIGNIN] Backend response data:', JSON.stringify(data, null, 2));

      const responseHeaders = new Headers();
      const origin = request.headers.get('origin') || '*';
      responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      responseHeaders.set('Access-Control-Expose-Headers', 'Set-Cookie');

      if (!response.ok) {
        const error = data.error || 'Authentication failed';
        console.error(`[SIGNIN] Backend error (${response.status}): ${error}`);
        return NextResponse.json(
          { error },
          { 
            status: response.status,
            headers: responseHeaders,
          }
        );
      }

      // Forward the response with CORS headers
      console.log('[SIGNIN] Creating successful response');
      const result = new NextResponse(JSON.stringify(data), {
        status: 200,
        headers: responseHeaders,
      });
      
      // Forward the session cookie if it exists
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log('[SIGNIN] Setting cookies in response');
        result.headers.set('Set-Cookie', cookies);
      } else {
        console.warn('[SIGNIN] No cookies in backend response');
      }
      
      console.log('[SIGNIN] Final response headers:', JSON.stringify(Object.fromEntries(result.headers.entries()), null, 2));
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[SIGNIN] Error calling backend:', error);
      return NextResponse.json(
        { error: `Failed to connect to authentication server: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
