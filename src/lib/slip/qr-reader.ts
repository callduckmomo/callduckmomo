"use client";

export async function extractQRFromImage(file: File): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Function can only be called in browser environment");
  }

  // Dynamic import for browser-only library
  const jsQR = (await import("jsqr")).default;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("ไม่สามารถสร้าง canvas ได้"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          resolve(code.data);
        } else {
          reject(new Error("ไม่พบ QR Code ในรูปภาพ กรุณาตรวจสอบว่าเป็นรูปสลิปโอนเงินที่ถูกต้อง"));
        }
      };

      img.onerror = () => {
        reject(new Error("ไม่สามารถโหลดรูปภาพได้"));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
    };

    reader.readAsDataURL(file);
  });
}

