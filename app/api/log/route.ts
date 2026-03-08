import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    const text = await req.text();
    const logPath = path.join(process.cwd(), 'animator-debug.log');
    fs.appendFileSync(logPath, `[CLIENT-LOG] ${text}\n`);
    return NextResponse.json({ ok: true });
}
