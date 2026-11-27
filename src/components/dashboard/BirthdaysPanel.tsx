// Aniversariantes do mês, com a mensagem pronta. Só quando a barbearia ligou.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cake, MessageCircle } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useShopFeatures } from '@/hooks/useShopFeatures'
import { featuresRepository } from '@/repositories/featuresRepository'
import { birthdaysOfMonth, buildBirthdayMessage, type Birthday } from '@/lib/extras'
import { waUrl } from '@/lib/whatsapp'

const BirthdaysPanel = () => {
  const { barbershop } = useTenant()
  const { features, loaded } = useShopFeatures(barbershop?.id)
  const [list, setList] = useState<Birthday[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!barbershop || !loaded || !features.birthdaysEnabled) return
    featuresRepository.birthdays(barbershop.id).then(setList).catch(() => setFailed(true))
  }, [barbershop?.id, loaded, features.birthdaysEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!barbershop || !loaded || !features.birthdaysEnabled) return null
  const now = new Date()
  const month = birthdaysOfMonth(list ?? [], now)

  return (
    <section aria-label="Aniversariantes do mês" className="border-l-2 border-pink-300/50 pl-4">
      <h2 className="flex items-center gap-2 text-white font-body font-semibold"><Cake className="w-4 h-4 text-pink-300" />Aniversariantes do mês</h2>
      {failed ? <p className="text-sm font-body text-red-300 mt-2">Não carregou os aniversários.</p>
        : list && month.length === 0 ? (
          <p className="text-sm font-body text-white/55 mt-1.5">Ninguém este mês. Guarde o dia e o mês na ficha em <Link to="/dashboard/clientes" className="underline underline-offset-2">Clientes</Link>.</p>
        ) : (
          <ul className="mt-1">
            {month.map(b => {
              const isToday = b.day === now.getDate()
              const wa = waUrl(b.phone, buildBirthdayMessage(b.name, barbershop.name, isToday))
              return (
                <li key={b.clientId} className="flex items-center gap-3 py-1.5">
                  <span className="w-12 text-sm font-body tabular-nums text-white/55">{String(b.day).padStart(2, '0')}/{String(b.month).padStart(2, '0')}</span>
                  <span className={`flex-1 min-w-0 truncate text-sm font-body ${b.day < now.getDate() ? 'text-white/45' : 'text-white/85'}`}>
                    {b.name}{isToday && <b className="ml-2 text-pink-300">é hoje</b>}
                  </span>
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Parabenizar ${b.name} no WhatsApp`}
                    className="w-10 h-10 grid place-items-center rounded-lg text-white/60 hover:text-emerald-300"><MessageCircle className="w-4 h-4" /></a>}
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}

export default BirthdaysPanel
