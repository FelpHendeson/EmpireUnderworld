# Empire Underworld

Base de um jogo de simulacao e gerenciamento de organizacao criminosa (estilo Mafia/Tycoon), construido com React + Vite + Tailwind.

## Stack
- React 18
- Vite 5
- Tailwind CSS 3
- Lucide React (icones)
- NanoID (ids unicos)

## Como rodar
```bash
npm install
npm run dev
```

Build de producao:
```bash
npm run build
npm run preview
```

## Estrutura principal
- `src/App.jsx`: UI principal + `useReducer` com toda a logica de jogo.
- `src/data/gameData.js`: dados base, regras de patente e fabrica do estado inicial.
- `src/index.css`: estilos globais e tokens visuais para tema noir/neon.
- `DEV.md`: documentacao tecnica detalhada do funcionamento.

## Mecanicas implementadas
- Recursos globais: `cash`, `influence`, `respect`.
- Mapa territorial (pais > estado > cidade > bairro) com estados de presenca:
  - `Inexistente` -> `Infiltrado` -> `Disputado` -> `Dominado`
- Renda passiva por turno para bairros dominados (`ADVANCE_DAY`).
- Crimes com requisitos e risco de falha (`ACTION_COMMIT_CRIME`).
- Mercado negro com compra de itens e efeitos imediatos (`ACTION_BUY_ITEM`).
- Recrutamento com custo em dinheiro ou respeito (`ACTION_RECRUIT`).
- Promocao de membros por XP + custo de recursos (`ACTION_PROMOTE`).
- Conflito territorial com chance de vitoria baseada em poder do time (`ACTION_TAKEOVER`).
- Linha do tempo de atividades para feedback narrativo.

## Observacoes
- A logica esta centralizada no reducer para facilitar persistencia futura (LocalStorage/API).
- Eventos aleatorios e sistema completo de tenentes/viloes ainda podem ser expandidos sobre a base atual.
