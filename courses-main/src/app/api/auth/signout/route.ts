import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const response = await fetch(`${apiUrl}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to sign out' },
        { status: response.status }
      );
    }

    // Clear the session cookie
    const result = NextResponse.json({ message: 'Successfully signed out' });
    result.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return result;
  } catch (error) {
    console.error('Error during sign out:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
