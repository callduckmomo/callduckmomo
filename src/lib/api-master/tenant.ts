export async function checkTenantStatus(): Promise<{ isSuspended: boolean }> {
  const masterUrl = process.env.MASTER_API_URL;
  const apiKey = process.env.MASTER_API_KEY;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID;

  // If this is the main site, or no API key is provided, we default to not suspended
  if (!masterUrl || !apiKey || siteId === 'main') {
    return { isSuspended: false };
  }

  try {
    const response = await fetch(`${masterUrl}/api/v1/tenant-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      // Cache the response for 5 minutes (300 seconds) to avoid spamming the master API
      next: { revalidate: 300, tags: ["tenant-status"] }, 
    });

    if (!response.ok) {
      console.error(`[checkTenantStatus] Master API returned status ${response.status}`);
      // Default to not suspended if the API is unreachable (graceful degradation)
      // Actually, if they are Unauthorized (401), we MIGHT want to suspend.
      // But let's rely on the explicit isSuspended payload for safety.
      if (response.status === 401 || response.status === 403) {
        return { isSuspended: true }; 
      }
      return { isSuspended: false };
    }

    const data = await response.json();
    return { isSuspended: data.isSuspended === true };
  } catch (error) {
    console.error("[checkTenantStatus] Failed to fetch tenant status:", error);
    return { isSuspended: false };
  }
}
