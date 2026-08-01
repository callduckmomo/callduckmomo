"use client";

import { useState } from "react";
import { saveMasterSettings, testMasterConnection } from "./actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SettingsForm({
  initialUrl,
  initialApiKey
}: {
  initialUrl: string;
  initialApiKey: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!url || !apiKey) {
      toast.error("กรุณากรอก URL และ API Key ก่อนทดสอบ");
      return;
    }
    
    setIsTesting(true);
    try {
      const res = await testMasterConnection(url, apiKey);
      if (res.success) {
        toast.success("เชื่อมต่อสำเร็จ! (Connection Successful)");
      } else {
        toast.error(`ล้มเหลว: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการทดสอบเชื่อมต่อ");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const res = await saveMasterSettings(formData);
      if (res.success) {
        toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      } else {
        toast.error(`ไม่สามารถบันทึกได้: ${res.error}`);
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="space-y-4">
        <div>
          <label htmlFor="master_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Master Domain URL (เว็ปแม่)
          </label>
          <input
            type="url"
            id="master_url"
            name="master_url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://master-website.com"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="master_api_key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Master API Key
          </label>
          <input
            type="text"
            id="master_api_key"
            name="master_api_key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="your-api-key"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting}
          className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
        >
          {isTesting ? "Testing..." : "ทดสอบการเชื่อมต่อ (Test Connection)"}
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? "Saving..." : "บันทึกการตั้งค่า (Save)"}
        </Button>
      </div>
    </form>
  );
}
