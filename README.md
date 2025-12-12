# Barber Pro - Sistema de Barbearia

Um sistema completo de gerenciamento para barbearias, construído com React, TypeScript e Tailwind CSS.

## 🚀 Tecnologias

- **React 18** - Biblioteca para construção de interfaces
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/UI** - Componentes de UI acessíveis
- **React Router DOM** - Roteamento
- **Date-fns** - Manipulação de datas
- **Framer Motion** - Animações
- **Lucide React** - Ícones

## 📋 Pré-requisitos

- Node.js 18+ ou Bun
- npm, yarn, pnpm ou bun

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd barber-pro
```

2. Instale as dependências:
```bash
# Com npm
npm install

# Com yarn
yarn install

# Com pnpm
pnpm install

# Com bun
bun install
```

3. Inicie o servidor de desenvolvimento:
```bash
# Com npm
npm run dev

# Com yarn
yarn dev

# Com pnpm
pnpm dev

# Com bun
bun dev
```

4. Acesse `http://localhost:5173` no navegador.

## 🏗️ Estrutura do Projeto

```
src/
├── assets/           # Imagens e recursos estáticos
├── components/       # Componentes reutilizáveis
│   └── ui/          # Componentes Shadcn/UI
├── contexts/         # Contexts React (Auth, Cart, etc.)
├── data/            # Dados estáticos (produtos, recompensas)
├── hooks/           # Custom hooks
├── lib/             # Utilitários
├── pages/           # Páginas da aplicação
├── services/        # Camada de serviços (pronta para backend)
└── types/           # Tipos TypeScript
```

## 🔌 Integração com Backend

O projeto está **preparado para integração com backend**. Todos os serviços estão na pasta `src/services/`:

- `userService.ts` - Autenticação e gerenciamento de usuários
- `appointmentService.ts` - Agendamentos
- `orderService.ts` - Pedidos
- `subscriptionService.ts` - Assinaturas VIP
- `loyaltyService.ts` - Programa de fidelidade
- `notificationService.ts` - Notificações
- `cartService.ts` - Carrinho de compras

### Como integrar com seu backend:

1. Em cada arquivo de serviço, substitua as implementações mock por chamadas API reais:

```typescript
// Antes (mock)
async getAll(): Promise<Appointment[]> {
  return appointments;
}

// Depois (com API)
async getAll(): Promise<Appointment[]> {
  const response = await fetch('/api/appointments');
  return response.json();
}
```

2. Configure a URL base da API em um arquivo `.env`:
```env
VITE_API_URL=https://sua-api.com
```

## 📦 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `dev` | Inicia servidor de desenvolvimento |
| `build` | Compila para produção |
| `preview` | Visualiza build de produção |
| `lint` | Executa linter |

## 🎨 Funcionalidades

- ✅ Sistema de autenticação (Login/Cadastro)
- ✅ Agendamento de cortes (usuários e visitantes)
- ✅ Loja de produtos
- ✅ Carrinho de compras
- ✅ Checkout com cálculo de frete
- ✅ Rastreamento de pedidos
- ✅ Programa de fidelidade
- ✅ Assinatura VIP com descontos
- ✅ Painel administrativo
- ✅ Sistema de notificações
- ✅ Avaliação de atendimentos
- ✅ Tema claro/escuro

## 📄 Licença

MIT
