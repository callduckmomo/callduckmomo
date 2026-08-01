import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const logPath = path.join(process.cwd(), "tmp", "verify_errors.log");
    
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ ok: true, logs: [] });
    }

    const logContent = fs.readFileSync(logPath, "utf8");
    const lines = logContent.split("\n").filter(Boolean);
    
    // Parse each line as JSON
    const logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    // Return latest first (reverse)
    return NextResponse.json({ ok: true, logs: logs.reverse() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized or failed to read logs";
    return NextResponse.json({ ok: false, message }, { status: error instanceof Error && error.message === "Forbidden" ? 403 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const logPath = path.join(process.cwd(), "tmp", "verify_errors.log");
    
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }

    return NextResponse.json({ ok: true, message: "ล้างประวัติการโอนที่ผิดพลาดสำเร็จ" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear logs";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
