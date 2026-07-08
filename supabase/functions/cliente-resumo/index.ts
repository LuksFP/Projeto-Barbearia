// Edge Function: cliente-resumo
// Gera um resumo em linguagem natural de um cliente da barbearia a partir dos
// dados já calculados no perfil (KPIs + insights + observações + histórico recente).
// Não lê o banco — apenas resume o que o frontend (autorizado por RLS) já tem.
// Usa Groq (OpenAI-compatible).
//
// Requer secret no Supabase:
//   GROQ_API_KEY
//
// Acesso: verify_jwt = true (config.toml) + checagem de usuário autenticado.

import { corsHeaders, json, err, aiGate } from '../_shared/supabase-admin.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM = `Você é o assistente de uma barbearia brasileira, falando com o dono.
Receberá os dados de UM cliente (visitas, gasto, serviço/barbeiro favorito, ticket
médio, frequência de retorno, faltas, observações e histórico recente) e deve
produzir um resumo curto e útil, em português do Brasil, tom de conversa.
Regras:
- "resumo": 2 a 3 frases descrevendo o perfil do cliente (fidelidade, preferências,
  padrão de retorno, pontos de atenção como faltas). Natural, sem repetir números crus
  desnecessariamente.
- "sugestao": UMA frase com uma ação prática para o dono (ex.: oferecer um combo,
  lembrar de agendar o retorno, atenção ao risco de sumiço).
- Sem jargão técnico. Não invente dados que não foram informados.
Responda APENAS um JSON válido, sem texto fora dele, no formato:
{"resumo":"...","sugestao":"..."}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Método não permitido', 405)

  // Exige plano Pro/Premium + rate limit (server-side, não só o gate do front).
  const gate = await aiGate(req, 'cliente-resumo', 40)
  if (!gate.ok) return err(gate.message, gate.status)

  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) return err('GROQ_API_KEY não configurada', 500)

  try {
    const data = await req.json()
    if (!data?.name) return json({ resumo: '', sugestao: '' })

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(data) },
        ],
      }),
    })

    if (!res.ok) {
      console.error('groq error', res.status, await res.text())
      return err('Falha ao gerar resumo', 502)
    }

    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)
    return json({
      resumo: typeof parsed?.resumo === 'string' ? parsed.resumo : '',
      sugestao: typeof parsed?.sugestao === 'string' ? parsed.sugestao : '',
    })
  } catch (e) {
    console.error('cliente-resumo error:', e)
    return err('Falha ao gerar resumo', 500)
  }
})
