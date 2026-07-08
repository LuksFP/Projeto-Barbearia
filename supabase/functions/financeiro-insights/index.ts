// Edge Function: financeiro-insights
// Gera insights financeiros em linguagem natural a partir do resumo já
// calculado no dashboard (getFinancials). Não lê o banco — apenas resume os
// números que o cliente já obteve via RLS. Usa Groq (OpenAI-compatible).
//
// Requer secret no Supabase:
//   GROQ_API_KEY
//
// Acesso: verify_jwt = true (config.toml) + checagem de usuário autenticado.

import { corsHeaders, json, err, aiGate } from '../_shared/supabase-admin.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM = `Você é um consultor financeiro de barbearias brasileiras.
Receberá os números de faturamento de uma barbearia (receita por mês, por
categoria de serviço e por barbeiro) e deve gerar de 2 a 4 insights curtos,
diretos e acionáveis, em português do Brasil, em tom de conversa com o dono da
barbearia. Regras:
- Cada insight tem no máximo uma frase.
- Aponte tendências (queda ou alta de faturamento), categorias e barbeiros que
  puxam o resultado.
- Inclua UMA sugestão prática quando fizer sentido (ex.: horário ocioso, promover
  uma categoria).
- Sem jargão técnico, sem repetir números crus desnecessariamente.
- "tone" = "positivo" (boa notícia), "alerta" (atenção/queda) ou "neutro".
Responda APENAS um JSON válido, sem texto fora dele, no formato:
{"insights":[{"tone":"positivo|alerta|neutro","text":"..."}]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Método não permitido', 405)

  // Exige plano Pro/Premium + rate limit (server-side, não só o gate do front).
  const gate = await aiGate(req, 'financeiro-insights', 20)
  if (!gate.ok) return err(gate.message, gate.status)

  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) return err('GROQ_API_KEY não configurada', 500)

  try {
    const data = await req.json()
    if (!data?.byMonth?.length) return json({ insights: [] })

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(data) },
        ],
      }),
    })

    if (!res.ok) {
      console.error('groq error', res.status, await res.text())
      return err('Falha ao gerar insights', 502)
    }

    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content ?? '{"insights":[]}'
    const parsed = JSON.parse(content)
    const insights = Array.isArray(parsed?.insights) ? parsed.insights.slice(0, 4) : []
    return json({ insights })
  } catch (e) {
    console.error('financeiro-insights error:', e)
    return err('Falha ao gerar insights', 500)
  }
})
