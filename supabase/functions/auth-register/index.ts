// Edge Function: auth-register
// Cadastro atômico: cria auth user + saas_account + barbershop em uma única operação.
// Se o RPC falhar, deleta o auth user via service_role para não deixar órfãos.
// verify_jwt = false — o usuário ainda não tem token ao se cadastrar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

interface RegisterBody {
  email: string
  password: string
  ownerName: string
  barbershopName: string
  barbershopSlug: string
  embedKey: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  let body: RegisterBody
  try {
    body = await req.json()
  } catch {
    return err('JSON inválido')
  }

  const { email, password, ownerName, barbershopName, barbershopSlug, embedKey } = body
  if (!email || !password || !ownerName || !barbershopName || !barbershopSlug || !embedKey) {
    return err('Todos os campos são obrigatórios')
  }

  const admin = createAdminClient()

  // 1. Cria o auth user via service_role (sem enviar email de confirmação)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma imediatamente — fluxo SaaS pago não precisa verificar email
  })

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      return err('Já existe uma conta com esse email.', 422)
    }
    return err(authError.message ?? 'Erro ao criar usuário.', 400)
  }

  const userId = authData.user.id

  // 2. Cria saas_account + barbershop via RPC atômica
  const { error: rpcError } = await admin.rpc('create_saas_account', {
    p_user_id:    userId,
    p_owner_name: ownerName,
    p_barb_name:  barbershopName,
    p_barb_slug:  barbershopSlug,
    p_embed_key:  embedKey,
  })

  if (rpcError) {
    // Rollback: deleta o auth user para não deixar órfão
    await admin.auth.admin.deleteUser(userId)

    if (rpcError.code === '23505') return err('Já existe uma conta com esse email.', 422)
    if (rpcError.message?.includes('barbershops_slug_format')) {
      return err('Nome da barbearia muito curto ou inválido. Use pelo menos 3 letras.', 422)
    }
    return err(rpcError.message ?? 'Erro ao criar conta.', 400)
  }

  // 3. Gera sessão para o usuário recém-criado
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !signInData.session) {
    // Conta criada com sucesso mas não conseguiu logar — retorna ok sem sessão
    // O usuário pode fazer login normalmente na página de login
    return json({ access_token: null, refresh_token: null })
  }

  return json({
    access_token:  signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  })
})
