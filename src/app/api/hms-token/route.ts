import { NextRequest, NextResponse } from 'next/server';

// 100ms token generation endpoint
// Requires: HMS_APP_ACCESS_KEY, HMS_APP_SECRET env vars
export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, role = 'guest' } = await request.json();

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'roomId and userId are required' },
        { status: 400 }
      );
    }

    const appAccessKey = process.env.HMS_APP_ACCESS_KEY;
    const appSecret = process.env.HMS_APP_SECRET;

    if (!appAccessKey || !appSecret) {
      console.error('Missing HMS credentials in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create management token (server-to-server auth)
    const managementToken = Buffer.from(`${appAccessKey}:${appSecret}`).toString('base64');

    // Request client token from 100ms API
    const response = await fetch('https://api.100ms.live/v2/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${managementToken}`,
      },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
        role,
        type: 'app',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('100ms token API error:', response.status, errorText);
      return NextResponse.json(
        { error: '100ms API error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

