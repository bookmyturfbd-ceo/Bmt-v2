import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, uid } from '@/lib/serverStore';

const ALLOWED = ['sports', 'divisions', 'cities', 'amenities', 'reviews'];

type Params = Promise<{ entity: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { entity } = await params;
  if (!ALLOWED.includes(entity)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(readData(entity));
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { entity } = await params;
  if (!ALLOWED.includes(entity)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data = readData<Record<string, unknown>>(entity);
  const item = { ...body, id: uid() };
  data.push(item);
  writeData(entity, data);
  return NextResponse.json(item, { status: 201 });
}
