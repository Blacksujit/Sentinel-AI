import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Create redirect response to home
  const response = NextResponse.redirect(new URL('/', req.url))
  
  // Clear all Clerk session cookies
  const cookiesToClear = [
    '__session',
    '__client_uat',
    '__clerk_db_jwt',
    '__clerk_client_jwt',
    '__clerk_session',
  ]
  
  cookiesToClear.forEach(name => {
    response.cookies.delete(name)
  })
  
  return response
}
