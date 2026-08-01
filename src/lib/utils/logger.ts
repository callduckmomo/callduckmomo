// Logger utility - ปิด console.log ใน production
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    // warnings ยังแสดงใน production
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // errors แสดงทุกที่
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

