import { registerAs } from '@nestjs/config';

export default registerAs('tiktokAds', () => ({
  baseUrl: process.env.TIKTOK_API_BASE_URL ?? 'https://business-api.tiktok.com/open_api/v1.3',
  accessToken: process.env.TIKTOK_ACCESS_TOKEN,
  appId: process.env.TIKTOK_APP_ID,
  appSecret: process.env.TIKTOK_APP_SECRET,
  advertiserId: process.env.TIKTOK_ADVERTISER_ID,
}));
