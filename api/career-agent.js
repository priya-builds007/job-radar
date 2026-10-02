// Vercel serverless function: POST /api/career-agent
// Uses the OpenAI Responses API when OPENAI_API_KEY is set in Vercel's environment variables.
// The key is read on the server only. Without it, GET reports configured:false and the
// website uses its built-in rule-based assistant, so nothing breaks.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.OPENAI_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ configured: Boolean(key) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!key) return res.status(503).json({ error: 'AI not configured' });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body.question !== 'string') return res.status(400).json({ error: 'Bad request' });
  const ctx = {
    profile: body.profile || {}, jobs: Array.isArray(body.jobs) ? body.jobs.slice(0, 8) : [],
    applications: body.applications || {}
  };
  const instructions =
    'You are Career AI, a concise, practical, encouraging career copilot for a fresher engineering student. ' +
    'Only recommend jobs listed in the JSON context (use their exact titles). Never invent jobs, companies or skills. ' +
    'If information is missing, say so. Answer in at most 120 words, using short bullet points.';
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions,
        input: 'Question: ' + body.question.slice(0, 500) + '\n\nContext JSON:\n' + JSON.stringify(ctx),
        max_output_tokens: 400
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'AI request failed' });
    const data = await r.json();
    const text = data.output_text ||
      (data.output || []).flatMap(o => o.content || []).map(c => c.text || '').join('').trim();
    return res.status(200).json({ answer: text || null });
  } catch (e) {
    return res.status(502).json({ error: 'AI request failed' });
  }
};
function safeParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }
