export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    try {
      const response = await fetch(`${url.origin}${path}`);
      if (!response.ok) throw new Error("File not found");
      return response;
    } catch (err) {
      return fetch(`${url.origin}/index.html`);
    }
  },
};
