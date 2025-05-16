// File: app/api/views/route.js
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request) {
  try {
    // Get the current count from KV
    let count = await kv.get('viewCount');
    
    // If count doesn't exist, initialize it to 0
    if (count === null) {
      count = 0;
    }

    // Increment the count
    const newCount = Number(count) + 1;

    // Update the count in KV
    await kv.set('viewCount', newCount);

    return NextResponse.json({ views: newCount });
  } catch (error) {
    console.error('Error processing view count in API:', error);
    return NextResponse.json(
      { error: 'Failed to update or retrieve view count', details: error.message },
      { status: 500 }
    );
  }
}