import { NextResponse } from 'next/server';

// Legacy stub — all entity routes are handled by dedicated Prisma-backed routes
// (e.g. /api/bmt/sports, /api/bmt/divisions, etc.)
export async function GET()  { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
export async function POST() { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
