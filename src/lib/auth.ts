import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify admin authentication from request headers.
 * The admin token is sent as: Authorization: Bearer <token>
 * or as a custom header: X-Admin-Token: <token>
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  try {
    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Verify token format: Base64(username:timestamp)
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      if (decoded && decoded.includes(':')) {
        const [username, _timestamp] = decoded.split(':');
        // Check if token is not expired (24 hours)
        const timestamp = parseInt(_timestamp);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (now - timestamp < maxAge) {
          const adminUsername = process.env.ADMIN_USERNAME || 'baga_admin';
          return username === adminUsername;
        }
      }
    }

    // Check X-Admin-Token header (fallback for simpler clients)
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken) {
      const decoded = Buffer.from(adminToken, 'base64').toString('utf-8');
      if (decoded && decoded.includes(':')) {
        const [username, _timestamp] = decoded.split(':');
        const timestamp = parseInt(_timestamp);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000;
        if (now - timestamp < maxAge) {
          const adminUsername = process.env.ADMIN_USERNAME || 'baga_admin';
          return username === adminUsername;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Middleware wrapper for admin API routes
 * Returns 401 if not authenticated
 */
export function withAdminAuth(
  handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> => {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in as admin.' },
        { status: 401 }
      );
    }
    return handler(request, context);
  };
}
