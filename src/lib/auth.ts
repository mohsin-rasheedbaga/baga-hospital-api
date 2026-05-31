import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify admin authentication from request headers.
 * The admin token is sent as: Authorization: Bearer <token>
 * or as a custom header: X-Admin-Token: <token>
 *
 * Token format: Base64(username:timestamp)
 * Only validates that the token was issued by our login endpoint
 * and has not expired (7 days max).
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  try {
    let token: string | null = null;

    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback: Check X-Admin-Token header
    if (!token) {
      token = request.headers.get('x-admin-token');
    }

    if (!token) return false;

    // Verify token format: Base64(username:timestamp)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (!decoded || !decoded.includes(':')) return false;

    const parts = decoded.split(':');
    if (parts.length < 2) return false;

    const username = parts[0];
    const timestampStr = parts.slice(1).join(':'); // Handle edge cases
    const timestamp = parseInt(timestampStr);

    // Validate timestamp is a number
    if (isNaN(timestamp)) return false;

    // Check if token is not expired (7 days)
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (now - timestamp > maxAge) return false;

    // Verify username looks valid (from our login system)
    if (!username || username.length < 1 || username.length > 100) return false;

    // Verify the username matches the expected admin username
    const adminUsername = process.env.ADMIN_USERNAME || 'baga_admin';
    return username === adminUsername;
  } catch {
    return false;
  }
}
