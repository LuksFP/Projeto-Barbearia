import { useEffect, useRef, useState } from 'react'
import { openOutsideApp } from '@/lib/pwaHead'
import { useTenant } from '@/contexts/TenantContext'
import {
  ExternalLink, Palette, Type, Phone, Image, Check, RefreshCw,
  Globe, Copy, CheckCheck, Upload, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Barbershop } from '@/types/tenant'
import { uploadCoverImage } from '@/lib/storage'
import { isDemoMode } from '@/lib/demo'
import { publicSiteLabel, publicSiteUrl } from '@/lib/siteUrl'

const COLOR_PRESETS = [
  { label: 'Âmbar',     primary: '#C9A84C', accent: '#8B6914' },
  { label: 'Vinho',     primary: '#9B1C1C', accent: '#7F1D1D' },
  { label: 'Esmeralda', primary: '#047857', accent: '#065F46' },
  { label: 'Índigo',    primary: '#4338CA', accent: '#3730A3' },
  { label: 'Cobre',     primary: '#B45309', accent: '#92400E' },
  { label: 'Branco',    primary: '#E5E7EB', accent: '#9CA3AF' },
]

type Section = 'branding' | 'conteudo' | 'contato' | 'site'

const Tab = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-body transition-all ${
      active
        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        : 'text-white/65 hover:text-white/70'
    }`}
  >
    {children}
  </button>
)

const Field = ({
  label, name, value, onChange, placeholder, multiline = false, hint
}: {
  label: string
  name: keyof Barbershop
  value: string
  onChange: (name: keyof Barbershop, val: string) => void
  placeholder?: string
  multiline?: boolean
  hint?: string
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-white/55 font-body tracking-wide uppercase">
        {label}
      </label>
      {hint && <span className="text-white/45 text-xs font-body">{hint}</span>}
    </div>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#262626] text-white placeholder:text-white/40 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#262626] text-white placeholder:text-white/40 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
      />
    )}
  </div>
)

const DashboardPersonalizar = () => {
  const { barbershop, updateBarbershop } = useTenant()
  const [section, setSection] = useState<Section>('branding')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [draft, setDraft] = useState<Barbershop | null>(barbershop)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const primaryRef = useRef<HTMLInputElement>(null)
  const accentRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(barbershop)
  }, [barbershop])

  if (!barbershop || !draft) return null

  const handleField = (name: keyof Barbershop, val: string) => {
    setDraft(prev => (prev ? { ...prev, [name]: val } : prev))
  }

  const handleSave = async () => {
    if (validationErrors.length > 0) return
    // Site externo/domínio próprio ainda não existe: todo site é o /b/slug
    const nextDraft = { ...draft, siteType: 'generic' as const, customDomain: '' }

    await updateBarbershop(nextDraft)
    setDraft(nextDraft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !barbershop) return
    if (isDemoMode()) {
      setUploadError('Upload não disponível no modo demo.')
      return
    }
    setUploadingCover(true)
    setUploadError('')
    try {
      const { url } = await uploadCoverImage(barbershop.id, file)
      const next = { ...draft!, coverImage: url }
      setDraft(next)
      await updateBarbershop(next)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload.')
    } finally {
      setUploadingCover(false)
      // Limpa o input para permitir reenvio do mesmo arquivo
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(barbershop)

  // [A3] Só aceita hex de 3 ou 6 dígitos
  const isValidHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)

  const validationErrors: string[] = []
  if (!isValidHex(draft.primaryColor)) validationErrors.push('Cor principal inválida')
  if (!isValidHex(draft.accentColor)) validationErrors.push('Cor de destaque inválida')
  if (draft.logoText.length > 20) validationErrors.push('Logo: máximo 20 caracteres')

  const previewUrl = `/b/${barbershop.slug}`

  const copyToClipboard =(text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-white/55 text-sm font-body mb-1">Site público</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">PERSONALIZAR</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={previewUrl}
            onClick={openOutsideApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a2a] text-white/65 hover:text-white hover:border-[#333] text-xs font-body transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver site
          </a>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSave}
              disabled={!hasChanges || validationErrors.length > 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : hasChanges && validationErrors.length === 0
                  ? 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400'
                  : 'bg-white/5 text-white/45 cursor-not-allowed'
              }`}
            >
              {saved ? <><Check className="w-4 h-4" /> Salvo</> : 'Salvar alterações'}
            </button>
            {validationErrors.length > 0 && (
              <p className="text-red-400 text-xs font-body">{validationErrors[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preview live da cor primária */}
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${draft.primaryColor}, ${draft.accentColor})` }}
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Tab active={section === 'branding'} onClick={() => setSection('branding')}>
          <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" />Identidade</span>
        </Tab>
        <Tab active={section === 'conteudo'} onClick={() => setSection('conteudo')}>
          <span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" />Conteúdo</span>
        </Tab>
        <Tab active={section === 'contato'} onClick={() => setSection('contato')}>
          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Contato</span>
        </Tab>
        <Tab active={section === 'site'} onClick={() => setSection('site')}>
          <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Site</span>
        </Tab>
      </div>

      <AnimatePresence mode="wait">
        {section === 'branding' && (
          <motion.div
            key="branding"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Coluna esquerda */}
            <div className="space-y-6">
              {/* Cores */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-5">
                <h2 className="text-white font-semibold font-body flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  Cores
                </h2>

                <div>
                  <p className="text-white/55 text-xs font-body mb-3">Paletas prontas</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setDraft(p => ({ ...p!, primaryColor: preset.primary, accentColor: preset.accent }))}
                        title={preset.label}
                        className="group relative flex flex-col items-center gap-1.5"
                      >
                        <div
                          className="w-10 h-10 rounded-xl border-2 transition-all"
                          style={{
                            background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                            borderColor: draft.primaryColor === preset.primary ? preset.primary : 'transparent',
                          }}
                        >
                          {draft.primaryColor === preset.primary && (
                            <Check className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <span className="text-white/55 text-xs font-body group-hover:text-white/75 transition-colors">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/55 font-body tracking-wide uppercase">
                      Cor principal
                    </label>
                    <button
                      onClick={() => primaryRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#333] transition-colors"
                    >
                      <div className="w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: draft.primaryColor }} />
                      <span className="text-white/75 text-sm font-mono font-body">{draft.primaryColor}</span>
                    </button>
                    <input ref={primaryRef} type="color" value={draft.primaryColor} onChange={e => handleField('primaryColor', e.target.value)} className="sr-only" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/55 font-body tracking-wide uppercase">
                      Cor de destaque
                    </label>
                    <button
                      onClick={() => accentRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#333] transition-colors"
                    >
                      <div className="w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: draft.accentColor }} />
                      <span className="text-white/75 text-sm font-mono font-body">{draft.accentColor}</span>
                    </button>
                    <input ref={accentRef} type="color" value={draft.accentColor} onChange={e => handleField('accentColor', e.target.value)} className="sr-only" />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4">
                <h2 className="text-white font-semibold font-body flex items-center gap-2">
                  <Image className="w-4 h-4 text-amber-400" />
                  Logo
                </h2>
                <Field label="Texto do logo" name="logoText" value={draft.logoText} onChange={handleField} placeholder="CORVO" hint="até 20 caracteres" />
              </div>
            </div>

            {/* Coluna direita */}
            <div className="space-y-6">
              {/* Preview live */}
              <div className="p-6 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
                <h2 className="text-white/70 text-xs font-semibold font-body tracking-wide uppercase">Prévia</h2>

                {/* Header simulado */}
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: draft.primaryColor + '22' }}
                >
                  <div
                    className="h-24 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${draft.primaryColor}18, ${draft.accentColor}10)` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: draft.primaryColor + '22', border: `1px solid ${draft.primaryColor}44` }}
                      >
                        <span style={{ color: draft.primaryColor }} className="text-sm font-heading">✂</span>
                      </div>
                      <span className="font-heading text-2xl tracking-wider" style={{ color: draft.primaryColor }}>
                        {draft.logoText || 'LOGO'}
                      </span>
                    </div>
                  </div>

                  {/* Botão CTA simulado */}
                  <div className="px-4 py-3 flex items-center justify-between bg-[#141414]">
                    <span className="text-white/65 text-xs font-body">{publicSiteLabel(barbershop.slug)}</span>
                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold font-body"
                      style={{ backgroundColor: draft.primaryColor, color: '#0a0a0a' }}
                    >
                      Agendar
                    </div>
                  </div>
                </div>

                {/* Gradiente de cor */}
                <div
                  className="h-2 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${draft.primaryColor}, ${draft.accentColor})` }}
                />
                <p className="text-white/45 text-xs font-body text-center">Atualiza em tempo real</p>
              </div>

              {/* Foto de capa */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4">
                <h2 className="text-white font-semibold font-body flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  Foto de capa
                </h2>

                {draft.coverImage ? (
                  <div className="relative group rounded-xl overflow-hidden border border-[#252525]">
                    <img src={draft.coverImage} alt="Capa da barbearia" className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-body hover:bg-white/20 transition-all"
                      >
                        {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Trocar imagem
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-[#2a2a2a] hover:border-amber-500/40 flex flex-col items-center justify-center gap-2 text-white/55 hover:text-white/75 transition-all"
                  >
                    {uploadingCover ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-body">Enviando...</span></>
                    ) : (
                      <><Upload className="w-6 h-6" /><span className="text-xs font-body">Clique para enviar JPG, PNG ou WebP (máx. 5 MB)</span></>
                    )}
                  </button>
                )}

                {uploadError && <p className="text-red-400 text-xs font-body">{uploadError}</p>}

                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="sr-only" />
                <p className="text-white/55 text-xs font-body">Recomendado: 1920×600 px.</p>
              </div>
            </div>
          </motion.div>
        )}

        {section === 'conteudo' && (
          <motion.div
            key="conteudo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-5"
          >
            <h2 className="text-white font-semibold font-body">Textos do site</h2>
            <Field label="Nome da barbearia" name="name" value={draft.name} onChange={handleField} placeholder="Barbearia Corvo" />
            <Field label="Tagline" name="tagline" value={draft.tagline} onChange={handleField} placeholder="Precisão que fala por si." hint="frase curta do hero" />
            <Field label="Descrição" name="description" value={draft.description} onChange={handleField} placeholder="Conte a história da sua barbearia..." multiline hint="exibida abaixo da tagline" />
          </motion.div>
        )}

        {section === 'contato' && (
          <motion.div
            key="contato"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-5"
          >
            <h2 className="text-white font-semibold font-body">Informações de contato</h2>
            <Field label="Telefone" name="phone" value={draft.phone} onChange={handleField} placeholder="(11) 99999-9999" />
            <Field label="WhatsApp" name="whatsapp" value={draft.whatsapp} onChange={handleField} placeholder="5511999999999" hint="só números + DDI" />
            <Field label="Endereço" name="address" value={draft.address} onChange={handleField} placeholder="Rua Exemplo, 123 — Bairro" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade" name="city" value={draft.city} onChange={handleField} placeholder="São Paulo" />
              <Field label="Estado" name="state" value={draft.state} onChange={handleField} placeholder="SP" />
            </div>
            <Field label="Instagram" name="instagram" value={draft.instagram} onChange={handleField} placeholder="@barbearia.corvo" />
          </motion.div>
        )}

        {section === 'site' && (
          <motion.div
            key="site"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4">
              <div>
                <h2 className="text-white font-semibold font-body mb-1">Endereço do seu site</h2>
                <p className="text-white/65 text-xs font-body">
                  É aqui que seus clientes veem os serviços e marcam horário. Mande no WhatsApp ou coloque na bio do Instagram.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f]">
                <p className="min-w-0 text-white/80 text-sm font-mono break-all">{publicSiteLabel(barbershop.slug)}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(publicSiteUrl(barbershop.slug), 'public-url')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-white/65 hover:text-white hover:border-[#333] text-xs font-body transition-all"
                  >
                    {copied === 'public-url'
                      ? <><CheckCheck className="w-3 h-3 text-emerald-400" />Copiado</>
                      : <><Copy className="w-3 h-3" />Copiar link</>}
                  </button>
                  <a
                    href={`/b/${barbershop.slug}`}
                    onClick={openOutsideApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-white/65 hover:text-white hover:border-[#333] text-xs font-body transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset */}
      {hasChanges && (
        <button
          onClick={() => setDraft({ ...barbershop })}
          className="flex items-center gap-1.5 text-white/45 hover:text-white/70 text-xs font-body transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Descartar alterações
        </button>
      )}
    </div>
  )
}

export default DashboardPersonalizar
