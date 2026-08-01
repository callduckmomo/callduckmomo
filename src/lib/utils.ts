import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * แปลง newline characters (ทั้ง \n และ \\n) เป็น actual line breaks
 * สำหรับแสดงผลใน HTML ที่ใช้ whitespace-pre-line หรือ whitespace-pre-wrap
 */
export function normalizeNewlines(text: string | null | undefined): string {
  if (!text) return ""
  // แปลง \\n (escaped) และ \n (actual) เป็น actual newline
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}
