import { NextRequest, NextResponse } from 'next/server';
import { simulateFailure, isFailureSimulated } from '@/lib/cloud';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, enable } = body;
    
    const validProviders = ['google_drive', 'dropbox', 'cloudinary'];
    
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }
    
    simulateFailure(provider, enable);
    
    return NextResponse.json({
      success: true,
      message: `Failure simulation ${enable ? 'enabled' : 'disabled'} for ${provider}`,
      data: { provider, failure_simulated: enable },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
