import { NextResponse } from 'next/server';

// Legacy stub — all entity routes are handled by dedicated Prisma-backed routes
export async function DELETE() { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
export async function PATCH()  { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
