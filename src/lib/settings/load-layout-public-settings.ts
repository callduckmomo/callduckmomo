import { getSettingValuesForLayout } from "@/lib/settings/repository";
import {
  LAYOUT_PUBLIC_SETTING_KEYS,
  type LayoutPublicSettings,
} from "@/lib/settings/public-keys";

export async function loadLayoutPublicSettings(): Promise<LayoutPublicSettings> {
  try {
    const values = await getSettingValuesForLayout([...LAYOUT_PUBLIC_SETTING_KEYS]);
    return values as LayoutPublicSettings;
  } catch {
    return Object.fromEntries(
      LAYOUT_PUBLIC_SETTING_KEYS.map((key) => [key, null])
    ) as LayoutPublicSettings;
  }
}
