# Plano de Melhorias - Empire Underworld

Este plano organiza as melhorias do sistema por prioridade, com foco em estabilidade, seguranca, qualidade de codigo, experiencia do jogador e evolucao do produto.

## Objetivos

- Tornar o projeto mais seguro para rodar fora do ambiente local.
- Reduzir risco de regressao com testes e typecheck confiaveis.
- Melhorar manutencao separando responsabilidades no frontend e backend.
- Evoluir a experiencia de jogo sem quebrar saves existentes.
- Criar uma base clara para futuras features: ranking, eventos, progresso e administracao.

## Prioridade 0 - Correcoes criticas

### 1. Corrigir typecheck do backend

Problema:
- `tsup` gera build, mas `tsc --noEmit` falha.
- `request.user.sub` nao esta tipado corretamente.
- `bcryptjs` esta sem declaracao de tipo.

Acoes:
- Adicionar tipo para payload JWT.
- Remover casts amplos em `auth.ts` e `saves.ts` quando possivel.
- Adicionar script `typecheck` no `backend/package.json`.
- Validar `npm run typecheck -w backend` no fluxo de qualidade.

Criterio de aceite:
- `npm run typecheck -w backend` passa sem erros.

### 2. Atualizar dependencias vulneraveis

Problema:
- `npm audit --omit=dev` reporta vulnerabilidades criticas em cadeia de JWT/Fastify.

Acoes:
- Atualizar `fastify`, `@fastify/jwt`, `@fastify/cors` e dependencias relacionadas com cuidado.
- Conferir breaking changes do `@fastify/jwt`.
- Rodar build, typecheck e testes de API apos upgrade.

Criterio de aceite:
- `npm audit --omit=dev` sem vulnerabilidades criticas/high em auth, servidor HTTP ou parsing.

### 3. Fortalecer JWT e sessao

Problema:
- Token nao tem expiracao explicita.
- Token fica em `localStorage`.

Acoes:
- Definir expiracao curta para access token.
- Planejar refresh token ou fluxo simples de renovacao.
- Tratar expiracao no frontend com logout limpo.
- Documentar comportamento de sessao.

Criterio de aceite:
- Token emitido com `expiresIn`.
- Front redireciona para login quando token expira.

## Prioridade 1 - Qualidade e testes

### 4. Isolar banco de testes

Problema:
- Testes de API dependem de `MONGODB_URI` real.

Acoes:
- Criar `MONGODB_TEST_URI` ou usar Mongo em memoria.
- Garantir cleanup dos dados criados em cada suite.
- Bloquear execucao de testes contra banco de producao.

Criterio de aceite:
- `npm run test -w backend` pode rodar sem sujar banco de desenvolvimento/producao.

### 5. Adicionar testes de reducer e gameplay

Problema:
- Regras centrais do jogo ficam no frontend sem cobertura automatizada.

Acoes:
- Adicionar Vitest no frontend.
- Testar:
  - `createInitialState`;
  - `extractSavableState`;
  - `HYDRATE_STATE`;
  - `ACTION_COMMIT_CRIME`;
  - `ACTION_RECRUIT`;
  - missoes e skills.
- Encapsular RNG para permitir testes deterministicos.

Criterio de aceite:
- Principais acoes do reducer possuem testes.

### 6. Criar gates padrao de qualidade

Acoes:
- Adicionar scripts:
  - `typecheck`;
  - `test`;
  - `lint` quando ESLint for configurado.
- Criar comando raiz `npm run verify` para rodar build, testes e typecheck.

Criterio de aceite:
- Um unico comando valida o estado minimo do projeto.

## Prioridade 2 - Contratos e backend

### 7. Adicionar schemas de validacao nas rotas

Problema:
- Payloads sao validados manualmente com casts.

Acoes:
- Definir schemas para:
  - register;
  - login;
  - save create/update;
  - params de slot.
- Validar tamanho maximo de strings.
- Padronizar erros em `{ message: string }`.

Criterio de aceite:
- Entrada invalida e rejeitada antes da regra de negocio.

### 8. Melhorar modelo de erro e observabilidade

Acoes:
- Criar helper para erros HTTP comuns.
- Padronizar mensagens em portugues ou ingles, sem mistura.
- Adicionar logs uteis para falha de banco, auth e save, sem dados sensiveis.

Criterio de aceite:
- Erros ficam consistentes entre rotas.

### 9. Preparar migracao de saves

Problema:
- `stateVersion` existe, mas ainda nao ha migrador explicito.

Acoes:
- Criar funcao de migracao/normalizacao por versao.
- Documentar mudancas de schema de estado.
- Cobrir carregamento de save legado em teste.

Criterio de aceite:
- Saves antigos carregam de forma previsivel apos alteracoes de estado.

## Prioridade 3 - Frontend e manutencao

### 10. Quebrar `App.jsx` em telas e componentes

Problema:
- `App.jsx` concentra auth, saves, modal, dashboard e jogo.

Acoes:
- Extrair:
  - `screens/AuthScreen.jsx`;
  - `screens/SaveScreen.jsx`;
  - `components/BackstoryModal.jsx`;
  - `components/ResourceCard.jsx`;
  - paineis do dashboard.
- Manter `App.jsx` como orquestrador de tela/sessao.

Criterio de aceite:
- `App.jsx` fica focado em fluxo principal, sem UI extensa inline.

### 11. Criar hooks de sessao e saves

Acoes:
- Criar `useAuthSession`.
- Criar `useCloudSaves`.
- Isolar bootstrap, login, logout, refresh de saves e autosave.

Criterio de aceite:
- Fluxos remotos deixam de ficar misturados com renderizacao.

### 12. Melhorar UX de saves

Acoes:
- Modal de confirmacao antes de apagar save.
- Feedback de sucesso ao salvar/apagar.
- Estado de loading por slot, nao global.
- Tratamento claro para erro de rede/API offline.

Criterio de aceite:
- Usuario entende quando uma acao esta em andamento, concluiu ou falhou.

## Prioridade 4 - Gameplay e produto

### 13. Balancear progressao

Acoes:
- Revisar economia de cash/respeito/influencia.
- Ajustar risco/recompensa dos crimes.
- Criar tabela de progressao por dia/level.
- Registrar mudancas em dados/config, nao espalhadas em UI.

Criterio de aceite:
- Progressao inicial nao trava e nao escala rapido demais.

### 14. Expandir eventos e historia

Acoes:
- Criar eventos de policia, traicao e disputa entre faccoes.
- Adicionar consequencias persistentes no estado.
- Melhorar modais de historia com recompensas e gatilhos claros.

Criterio de aceite:
- Eventos afetam decisoes de gameplay, nao apenas texto.

### 15. Melhorar mapa, timeline e NPCs

Acoes:
- Organizar a tela principal em abas de jogo para reduzir scroll e bagunca visual.
- Dar ao mapa uma leitura mais parecida com jogo: setores, controle, ameaca e painel de alvo.
- Transformar a timeline em painel com filtros, contadores e leitura em modal.
- Separar NPCs locais em rede e conversas, com interacao semi-estatica.
- Criar progressao de dominio por local: casa, base e area.
- Ligar upgrades de dominio a recursos, membros e reputacao.

Criterio de aceite:
- Jogador entende melhor o historico recente, conversa com contatos locais e percebe crescimento territorial.

### 16. Melhorar ranking

Acoes:
- Definir criterio oficial: cash, respeito, dia, territorios ou score composto.
- Persistir score calculado para consulta rapida.
- Evitar expor dados sensiveis ou save completo.

Criterio de aceite:
- Leaderboard reflete progresso real do jogo e tem contrato documentado.

## Prioridade 5 - Operacao e deploy

### 17. Configurar ambientes

Acoes:
- Separar `.env.example` por desenvolvimento, teste e producao.
- Documentar variaveis obrigatorias.
- Validar `PORT`, `HOST`, `CORS_ORIGIN`, `JWT_SECRET`, `MONGODB_URI`.

Criterio de aceite:
- Setup novo fica reproduzivel sem conhecimento tribal.

### 18. Preparar deploy

Acoes:
- Definir plataforma de frontend e backend.
- Configurar build e start command.
- Definir estrategia de CORS por ambiente.
- Adicionar healthcheck real com status de Mongo.

Criterio de aceite:
- Aplicacao sobe em ambiente remoto com passos documentados.

## Roadmap sugerido

### Sprint 1 - Base segura

- Corrigir typecheck.
- Atualizar dependencias vulneraveis.
- Adicionar expiracao de JWT.
- Criar script `verify`.

### Sprint 2 - Testes confiaveis

- Isolar banco de testes.
- Cobrir rotas principais.
- Adicionar testes do reducer.
- Encapsular RNG.

### Sprint 3 - Refactor frontend

- Extrair telas e componentes.
- Criar hooks de auth/saves.
- Adicionar confirmacao de delete.
- Melhorar feedback de autosave.

### Sprint 4 - Contratos e saves

- Adicionar schemas de API.
- Criar migrador de `stateVersion`.
- Documentar contratos.
- Testar save legado.

### Sprint 5 - Evolucao de gameplay

- Balancear economia.
- Expandir eventos.
- Melhorar mapa, timeline e NPCs.
- Melhorar ranking.
- Criar novos objetivos/missoes.

## Checklist de acompanhamento

- [x] Typecheck do backend passando.
- [x] Dependencias criticas atualizadas.
- [x] JWT com expiracao.
- [ ] Testes isolados de banco real.
- [ ] Reducer com testes principais.
- [ ] API com schemas de validacao.
- [ ] `App.jsx` dividido em telas/componentes.
- [ ] Hooks de auth e saves criados.
- [ ] Confirmacao para apagar save.
- [ ] Migracao de saves por `stateVersion`.
- [x] Comando `verify` criado.
- [x] Timeline com filtros e modal de detalhe.
- [x] Conversas semi-estaticas com NPCs locais.
- [x] Progressao casa/base/area criada.
- [x] Navegacao interna por abas no jogo.
- [x] Mapa tatico com setores, controle e ameaca.
- [ ] Deploy documentado.

## Metricas de saude

- Build verde.
- Typecheck verde.
- Testes backend verdes.
- Testes frontend/gameplay verdes.
- `npm audit --omit=dev` sem vulnerabilidades criticas/high.
- Nenhum `.env` ou segredo versionado.
- Saves antigos carregando apos mudancas de gameplay.
