import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'BAGA Hospital API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      licenseCheck: 'POST /api/license/check',
      login: 'POST /api/auth/login',
    },
  });
}
