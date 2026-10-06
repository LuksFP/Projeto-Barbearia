import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Estado das simulações da landing. Nada aqui toca o banco: é só pra o visitante
// marcar um horário no celular de mentira e ver ele cair na agenda do capítulo seguinte.

export interface Servico {
  id: string
  nome: string
  preco: number
  minutos: number
}

export interface Reserva {
  servico: Servico
  hora: string
}

export const SERVICOS: Servico[] = [
  { id: 'degrade', nome: 'Corte Degradê', preco: 65, minutos: 45 },
  { id: 'barba', nome: 'Barba Completa', preco: 45, minutos: 30 },
  { id: 'combo', nome: 'Corte + Barba', preco: 100, minutos: 70 },
]

export const HORARIOS = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
export const OCUPADOS = ['14:00', '16:30']

export const somarMinutos = (hora: string, minutos: number): string => {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const reais = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

interface DemoValue {
  reserva: Reserva | null
  reservar: (reserva: Reserva | null) => void
}

const DemoContext = createContext<DemoValue | null>(null)

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [reserva, reservar] = useState<Reserva | null>(null)
  const valor = useMemo(() => ({ reserva, reservar }), [reserva])
  return <DemoContext.Provider value={valor}>{children}</DemoContext.Provider>
}

export const useDemo = (): DemoValue => {
  const valor = useContext(DemoContext)
  if (!valor) throw new Error('useDemo precisa estar dentro de <DemoProvider>')
  return valor
}
