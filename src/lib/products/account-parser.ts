/**
 * Parser สำหรับแยกข้อมูลบัญชีจาก text input
 */

export type AccountData = {
  email: string;
  password: string;
  details: string; // เก็บข้อมูลทั้งหมดของบัญชี
  rawLines: string[];
};

export type Separator = ',' | '|' | ':' | ';' | '----';

/**
 * แยกข้อมูลบัญชีจาก text input
 */
export function parseAccountData(
  input: string,
  separator: Separator = ','
): AccountData[] {
  if (!input.trim()) {
    return [];
  }

  // แยกข้อมูลตาม separator
  let chunks: string[] = [];
  
  if (separator === ',') {
    // แยกด้วย comma - หา comma ที่ตามด้วย newline หรืออยู่ระหว่างชุดข้อมูล
    // ลองแยกด้วย comma ที่ตามด้วย newline ก่อน
    chunks = input.split(/,\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
    // ถ้าไม่ได้ ลองแยกด้วย comma ทั่วไป
    if (chunks.length <= 1) {
      chunks = input.split(/,\s+/).map(chunk => chunk.trim()).filter(chunk => chunk);
    }
  } else if (separator === '|') {
    // แยกด้วย pipe - หา pipe ที่อยู่ระหว่างชุดข้อมูล
    // ลองแยกด้วย pipe ที่ตามด้วย newline ก่อน
    chunks = input.split(/\|\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
    // ถ้าไม่ได้ ลองแยกด้วย pipe ที่ตามด้วย pattern "เข้าระบบ"
    if (chunks.length <= 1 && input.includes('|')) {
      const pipeWithPattern = /\|\s*(?=เข้าระบบ|เข้าสู่ระบบ|เข้าถึง)/i;
      if (pipeWithPattern.test(input)) {
        chunks = input.split(pipeWithPattern).map(chunk => chunk.trim()).filter(chunk => chunk);
      }
    }
    // ถ้ายังไม่ได้ ลองแยกด้วย pipe ที่มี space ตามมา
    if (chunks.length <= 1) {
      chunks = input.split(/\|\s+/).map(chunk => chunk.trim()).filter(chunk => chunk);
    }
    // ถ้ายังไม่ได้ ลองแยกด้วย pipe ทั่วไป (ไม่มี space)
    if (chunks.length <= 1 && input.includes('|')) {
      chunks = input.split(/\|/).map(chunk => chunk.trim()).filter(chunk => chunk);
    }
  } else if (separator === ':') {
    // แยกด้วย colon - ระวังเพราะ colon ใช้ใน Email: และ Pass: ด้วย
    // แยกเฉพาะ colon ที่ตามด้วย newline
    chunks = input.split(/:\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
  } else if (separator === ';') {
    // แยกด้วย semicolon
    chunks = input.split(/;\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
    if (chunks.length <= 1) {
      chunks = input.split(/;\s+/).map(chunk => chunk.trim()).filter(chunk => chunk);
    }
  } else if (separator === '----') {
    // แยกด้วย triple dash
    chunks = input.split(/----\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
    if (chunks.length <= 1) {
      chunks = input.split(/----\s+/).map(chunk => chunk.trim()).filter(chunk => chunk);
    }
  }
  
  // ถ้ายังแยกไม่ได้ ให้ถือว่าเป็น 1 ชุดข้อมูล
  if (chunks.length === 0 || (chunks.length === 1 && chunks[0] === input.trim())) {
    chunks = [input.trim()];
  }

  const accounts: AccountData[] = [];

  for (const chunk of chunks) {
    // เก็บข้อมูลทั้งหมดของ chunk นี้
    const details = chunk.trim();
    
    // แยกเป็นบรรทัดเพื่อหา email และ password
    const lines = chunk.split('\n').map(line => line.trim()).filter(line => line);
    
    let email = '';
    let password = '';
    const rawLines: string[] = [];

    for (const line of lines) {
      rawLines.push(line);
      
      // หา Email/Mail - รองรับทั้ง "Email :", "Mail :", "⚜ Mail :"
      // รองรับ colon แบบไทย (：) และ colon แบบอังกฤษ (:)
      const emailMatch = line.match(/(?:Email|Mail|⚜\s*Mail)\s*[:：]\s*(.+)$/i);
      if (emailMatch && !email) {
        email = emailMatch[1].trim();
      }

      // หา Pass/Password - รองรับทั้ง "Pass:", "Pass :"
      // รองรับ colon แบบไทย (：) และ colon แบบอังกฤษ (:)
      const passMatch = line.match(/Pass(?:word)?\s*[:：]\s*(.+)$/i);
      if (passMatch && !password) {
        password = passMatch[1].trim();
      }
    }

    // เพิ่มบัญชีเสมอ (แม้จะไม่มี email/password) เพื่อเก็บรายละเอียดทั้งหมด
    accounts.push({
      email,
      password,
      details, // เก็บข้อมูลทั้งหมด
      rawLines,
    });
  }

  return accounts;
}

/**
 * แปลง AccountData array เป็น text format
 */
export function formatAccountData(
  accounts: AccountData[],
  separator: Separator = ','
): string {
  if (!accounts || accounts.length === 0) {
    return '';
  }
  
  // ใช้ details ถ้ามี (ข้อมูลเต็ม) ถ้าไม่มีใช้ rawLines
  const formattedAccounts = accounts.map((account) => {
    if (account.details) {
      return account.details;
    }
    // ถ้าไม่มี details ใช้ rawLines
    return account.rawLines.join('\n');
  });
  
  // ใช้ separator ที่กำหนด
  if (separator === ',') {
    return formattedAccounts.join(',\n\n');
  } else if (separator === '|') {
    return formattedAccounts.join('|\n\n');
  } else if (separator === ':') {
    return formattedAccounts.join(':\n\n');
  } else if (separator === ';') {
    return formattedAccounts.join(';\n\n');
  } else if (separator === '----') {
    return formattedAccounts.join('\n\n----\n\n');
  }
  
  // Default: comma
  return formattedAccounts.join(',\n\n');
}

/**
 * Detect separator จากข้อมูลที่บันทึกไว้
 */
export function detectSeparator(input: string): Separator {
  if (!input.trim()) {
    return ',';
  }
  
  // ตรวจสอบ separator ต่างๆ ตามลำดับความน่าจะเป็น
  // ตรวจสอบ comma ที่ตามด้วย newline
  if (input.match(/,\s*\n/)) {
    return ',';
  }
  // ตรวจสอบ pipe ที่ตามด้วย newline
  if (input.match(/\|\s*\n/)) {
    return '|';
  }
  // ตรวจสอบ semicolon ที่ตามด้วย newline
  if (input.match(/;\s*\n/)) {
    return ';';
  }
  // ตรวจสอบ triple dash
  if (input.includes('----')) {
    return '----';
  }
  // ตรวจสอบ colon ที่ตามด้วย newline (ระวัง Email: และ Pass:)
  if (input.match(/:\s*\n/)) {
    return ':';
  }
  
  // Default: comma
  return ',';
}

/**
 * Parse JSON data safely, unpacking double/triple stringified values
 */
export function safeParseJson<T>(val: any): T | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val as unknown as T;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    // If it is just an empty string or empty spaces, don't parse as JSON
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      let parsed = JSON.parse(val);
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed as T;
    } catch {
      return null;
    }
  }
  return null;
}
