import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function isClerkConfigured(): boolean {
  return (
    Boolean(process.env.CLERK_SECRET_KEY?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())
  )
}

const PUBLIC_ROUTES = [
  '/',
  '/start(.*)',
  '/setup(.*)',
  '/docs(.*)',
  '/hack(.*)',
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
  '/org-onboarding(.*)',
  '/user/onboarding(.*)',
  '/post-auth(.*)',
  '/org-selector(.*)',
  '/api/sign-out(.*)',
  '/invite(.*)',
]

type ClerkMiddlewareFn = (req: NextRequest) => Response | Promise<Response>

let clerkHandler: ClerkMiddlewareFn | null = null

async function getClerkHandler(): Promise<ClerkMiddlewareFn> {
  if (clerkHandler) return clerkHandler

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES)

  clerkHandler = clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  }) as ClerkMiddlewareFn

  return clerkHandler
}

export default async function middleware(request: NextRequest) {
  if (!isClerkConfigured()) {
    return NextResponse.next()
  }

  try {
    const handler = await getClerkHandler()
    return handler(request)
  } catch (error) {
    console.error('[middleware] Clerk invocation failed:', error)
    return new NextResponse('Authentication service unavailable', { status: 503 })
  }
}

export const config = {
  matcher: [
    '/((?!_next|api|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
