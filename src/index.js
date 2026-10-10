const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, _ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Root endpoint with usage details
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify(
          {
            name: "phish-hook",
            description: "Cloudflare Workers AI Phishing Detector",
            endpoints: {
              "POST /analyze": "Analyze email or message content for phishing threats",
              "POST /chat": "Generic AI chat completion endpoint",
            },
            examplePayload: {
              content: "Urgent: Your account will be suspended within 24 hours. Click here to verify.",
              sender: "security-alert@suspicious-domain.com",
              subject: "Immediate Action Required",
            },
          },
          null,
          2
        ),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Phishing analysis endpoint
    if (url.pathname === "/analyze" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const content = body.content || body.message || body.text;
        const sender = body.sender || "Unknown";
        const subject = body.subject || "No Subject";

        if (!content) {
          return new Response(
            JSON.stringify({ error: "Missing required 'content' field in JSON body." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        const promptInput = `Sender: ${sender}\nSubject: ${subject}\n\nBody/Content:\n${content}`;

        const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            {
              role: "system",
              content:
                "You are an expert cybersecurity phishing detection system. Analyze the provided message/email details for phishing indicators (urgency, spoofed domains, suspicious links, credential harvesting, impersonation). Provide an objective assessment including risk level (LOW, MEDIUM, HIGH, CRITICAL), phishing probability (0-100%), identified red flags, and recommendations.",
            },
            {
              role: "user",
              content: promptInput,
            },
          ],
        });

        return new Response(
          JSON.stringify({
            success: true,
            analysis: aiResponse.response,
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // General chat/prompt endpoint
    if (url.pathname === "/chat" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const prompt = body.prompt || body.message;

        if (!prompt) {
          return new Response(
            JSON.stringify({ error: "Missing 'prompt' in request body." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          prompt,
        });

        return new Response(JSON.stringify(aiResponse), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Not Found", message: `No route for ${request.method} ${url.pathname}` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  },
};
