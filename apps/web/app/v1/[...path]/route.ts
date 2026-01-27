import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081'
const FORWARD_HEADERS = ['authorization', 'content-type', 'cookie']

function joinURL(base: string, path: string, search: string) {
  const normalized = path.replace(/^\/+/, '')
  const u = new URL(`v1/${normalized}`, base.endsWith('/') ? base : base + '/')
  if (search) u.search = search
  return u.toString()
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const target = joinURL(API_BASE, params.path.join('/'), req.nextUrl.search)

  const headers = new Headers()
  req.headers.forEach((v, k) => {
    if (FORWARD_HEADERS.includes(k.toLowerCase())) headers.set(k, v)
  })

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    const ab = await req.arrayBuffer()
    init.body = Buffer.from(ab)
  }

  const res = await fetch(target, init)
  return new Response(res.body, { status: res.status, headers: res.headers })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(req, await params) }
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(req, await params) }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(req, await params) }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(req, await params) }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(req, await params) }


