import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(event) {
    try {
      return await getAssetFromKV(event);
    } catch (e) {
      return await getAssetFromKV(event, {
        mapRequestToAsset: req =>
          new Request(`${new URL(req.url).origin}/index.html`, req),
      });
    }
  },
};
