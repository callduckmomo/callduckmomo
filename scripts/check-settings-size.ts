import { config } from "dotenv";
config({ path: ".env.main" });

import { getSettingValuesCached } from "../src/lib/settings/repository";

async function run() {
  const settings = await getSettingValuesCached([
      "home_movie_poster_1",
      "home_movie_poster_2",
      "home_movie_poster_3",
      "home_movie_poster_4",
      "home_movie_poster_5",
      "home_shortcut_image_1",
      "home_shortcut_image_2",
      "home_shortcut_image_3",
      "home_shortcut_image_4",
      "home_poster_image_url",
      "logo_image_url"
  ]);

  let totalSize = 0;
  for (const [key, value] of Object.entries(settings)) {
    if (value && typeof value === 'string') {
        const size = Buffer.byteLength(value, 'utf8');
        console.log(`${key}: ${(size / 1024 / 1024).toFixed(2)} MB`);
        totalSize += size;
    }
  }
  console.log(`Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

run().catch(console.error).finally(() => process.exit(0));
