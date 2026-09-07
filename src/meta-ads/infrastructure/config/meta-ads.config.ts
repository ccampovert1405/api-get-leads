import { registerAs } from '@nestjs/config';

export default registerAs('metaAds', () => ({
  baseUrl: process.env.META_GRAPH_API_URL ?? 'https://graph.facebook.com/v19.0',
  accessToken: process.env.META_ACCESS_TOKEN,
  appId: process.env.META_APP_ID,
  appSecret: process.env.META_APP_SECRET,
  adAccountId: process.env.META_AD_ACCOUNT_ID,
}));
