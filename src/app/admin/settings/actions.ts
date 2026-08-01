"use server";

import { updateSetting, getSettingValue } from "@/lib/settings/repository";
import { revalidatePath } from "next/cache";

export async function saveMasterSettings(formData: FormData) {
  try {
    const url = formData.get("master_url") as string;
    const apiKey = formData.get("master_api_key") as string;

    if (url !== null) {
      // Remove trailing slash if present
      const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      await updateSetting("MASTER_DOMAIN_URL", cleanUrl);
    }
    
    if (apiKey !== null) {
      await updateSetting("MASTER_API_KEY", apiKey);
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    
    return { success: true };
  } catch (error) {
    console.error("Error saving master settings:", error);
    return { success: false, error: "Failed to save settings" };
  }
}

export async function testMasterConnection(url: string, apiKey: string) {
  try {
    const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    
    // In a real scenario, the master might have a specific /api/v1/test-connection endpoint
    const res = await fetch(`${cleanUrl}/api/v1/test-connection`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      // Timeout is a good idea, but fetch doesn't support timeout directly without AbortController
    });

    if (res.ok) {
      return { success: true };
    } else {
      return { success: false, error: `Connection failed with status: ${res.status}` };
    }
  } catch (error: any) {
    console.error("Connection test failed:", error);
    return { success: false, error: error.message || "Failed to connect to the master API" };
  }
}

export async function getTenantBalance(url: string, apiKey: string) {
  try {
    if (!url || !apiKey) return { success: false, balance: null, error: "Missing API configuration" };
    
    const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const res = await fetch(`${cleanUrl}/api/v1/tenant/balance`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, balance: data.balance };
    } else {
      return { success: false, balance: null, error: `Failed with status: ${res.status}` };
    }
  } catch (error: any) {
    console.error("Failed to fetch tenant balance:", error);
    return { success: false, balance: null, error: error.message || "Failed to connect to the master API" };
  }
}

export async function fetchMasterBalanceForAdmin() {
  try {
    const url = await getSettingValue("MASTER_DOMAIN_URL");
    const apiKey = await getSettingValue("MASTER_API_KEY");
    if (!url || !apiKey) return { success: false, balance: null, error: "Missing config" };
    
    return await getTenantBalance(url, apiKey);
  } catch (error: any) {
    return { success: false, balance: null, error: error.message };
  }
}
