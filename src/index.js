export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Hello from Cloudflare Workers!", {
        headers: {
          "content-type": "text/plain;charset=UTF-8",
        },
      });
    }

    return new Response(`Hello from ${url.pathname}`, {
      headers: {
        "content-type": "text/plain;charset=UTF-8",
      },
    });
  },
};
