export default {
  async fetch(request) {
    return new Response("This is a dummy Worker to satisfy Wrangler CLI cuz its being bitchy.", {
      headers: { "content-type": "text/plain" },
    });
  },
};
