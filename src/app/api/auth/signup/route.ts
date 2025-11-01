import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const userData = await request.json();
    
    // Validate required fields
    const { email, password, first_name, last_name } = userData;
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Email, password, first name, and last name are required' },
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

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auth/signup`;
    console.log('Calling backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Backend response status:', response.status);
    console.log('Backend response data:', data);

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Registration failed' },
        { 
          status: response.status,
          headers: responseHeaders,
        }
      );
    }

    // Forward the response with CORS headers
    const result = new NextResponse(JSON.stringify(data), {
      status: 201,
      headers: responseHeaders,
    });
    
    // Forward the session cookie if it exists
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      result.headers.set('Set-Cookie', cookies);
    }

    return result;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
