import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/serverStore';

const ALLOWED = ['sports', 'divisions', 'cities', 'amenities', 'reviews'];

type Params = Promise<{ entity: string; id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { entity, id } = await params;
  if (!ALLOWED.includes(entity)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data = readData<Record<string, unknown>>(entity).filter((item) => item.id !== id);
  writeData(entity, data);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { entity, id } = await params;
  if (!ALLOWED.includes(entity)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const patch = await req.json();
  const data = readData<Record<string, unknown>>(entity).map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  writeData(entity, data);
  return NextResponse.json({ ok: true });
}
