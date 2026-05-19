# Guardrails - Empire Underworld

Este documento define regras de engenharia para manter a codebase simples, segura e facil de evoluir. Ele complementa `DEV.md`, `frontend/dev.md` e `backend/dev.md`.

## 1. Principios

- Clareza antes de esperteza: prefira codigo obvio, nomes diretos e fluxos previsiveis.
- Mudancas pequenas: altere apenas o necessario para resolver o problema.
- Contratos explicitos: entradas, saidas, erros e estado persistido devem ser validados.
- Baixo acoplamento: frontend cuida do loop de jogo; backend cuida de auth, saves e dados agregados.
- Testabilidade: regra de negocio deve ficar em funcoes pequenas e, quando possivel, puras.
- Seguranca por padrao: segredo, token, senha e payload externo nunca devem ser tratados como confiaveis.

## 2. Padrao de arquitetura

### Monorepo

- `frontend/` contem UI, gameplay local, reducer e cliente HTTP.
- `backend/` contem API, auth, persistencia e agregacoes.
- A raiz deve manter apenas scripts de workspace, documentacao e configuracoes compartilhadas.

### Frontend

- `App.jsx` deve orquestrar telas e estado de sessao. Evite adicionar regra de jogo nova diretamente nele quando ela puder ficar em `src/game`.
- Regras de gameplay devem ficar em `src/game/reducer.js` ou em modulos de `src/game/modules`.
- Dados estaticos de campanha devem ficar em `src/data` ou `src/content`.
- Chamadas HTTP devem passar por `src/services/api.js`; componentes nao devem chamar `fetch` diretamente.
- Estado efemero de UI nao deve ser persistido no save. Use `extractSavableState` como fronteira.

### Backend

- `src/app.ts` registra plugins e rotas; nao deve conter regra de dominio.
- `src/server.ts` apenas inicia servidor e conexao externa.
- Cada rota deve validar input antes de acessar banco.
- Rotas protegidas devem usar `{ preHandler: [app.authenticate] }`.
- Models Mongoose representam persistencia; nao devem virar deposito de regra complexa.

## 3. Padroes de codigo limpo

- Use nomes que expressem intencao: `saveCurrentProgress`, `normalizeStatePayload`, `extractSavableState`.
- Evite funcoes longas. Quando uma funcao passar a misturar validacao, transformacao e efeito externo, extraia helpers.
- Evite flags booleanas que mudam muito o comportamento interno. Prefira funcoes separadas quando o fluxo divergir bastante.
- Evite `any`. Quando inevitavel, isole em uma borda externa e converta para tipo seguro o quanto antes.
- Nao duplique constantes de contrato. Slots, versao de estado e limites devem ter fonte clara.
- Comentarios devem explicar decisao ou contexto, nao repetir o que o codigo ja diz.
- Erros devem ser acionaveis: mensagem curta, status HTTP correto e sem vazar dados sensiveis.

## 4. Contratos e validacao

- Todo payload de API deve validar:
  - campos obrigatorios;
  - tipo;
  - formato;
  - tamanho maximo;
  - dominio permitido.
- `email` deve ser normalizado para lowercase antes de persistir ou comparar.
- `username`, nomes de campanha e strings vindas do cliente devem ter `trim` e limite de tamanho.
- `slot` deve continuar restrito a `slot-1`, `slot-2`, `slot-3`.
- `state` de save deve ser tratado como entrada nao confiavel, mesmo vindo do proprio frontend.
- Mudancas em `stateVersion` exigem estrategia de migracao ou normalizacao retrocompativel.

## 5. Seguranca

- Nunca commitar `.env`, segredo, token, URI real de banco ou credencial.
- `JWT_SECRET` deve ser forte e diferente por ambiente.
- Tokens devem ter expiracao definida antes de producao.
- Senhas nunca devem ser logadas, retornadas ou armazenadas sem hash.
- Mensagens de login devem evitar enumeracao de usuario. Use erro generico para credenciais invalidas.
- CORS deve apontar somente para origens esperadas.
- Leaderboard e endpoints publicos nao devem expor email, token, hash ou payload completo de save.
- Dependencias de auth e framework web devem ser mantidas atualizadas com prioridade.

## 6. Persistencia e saves

- Save persistido deve conter snapshot suficiente para restaurar campanha sem depender de estado de UI.
- Campos espelhados (`day`, `resources`, `meta`, `stateVersion`) devem ser derivados do `state` no backend.
- Nao confie em valores numericos do cliente. Normalize `NaN`, negativos e infinito.
- Payload grande deve ser rejeitado antes de gravar no Mongo.
- Alteracoes no schema devem preservar compatibilidade com saves antigos sempre que viavel.
- Se a regra exigir quebra de compatibilidade, documente a migracao.

## 7. Gameplay e regras de dominio

- Regras de jogo devem ser deterministicas quando possivel.
- Uso de `Math.random` deve ficar encapsulado para permitir testes futuros com RNG injetavel.
- Toda nova acao do reducer deve:
  - validar pre-condicoes;
  - retornar o estado original quando a acao nao for permitida;
  - manter imutabilidade;
  - atualizar logs de forma limitada;
  - passar por sistemas pos-acao quando afetar missao, skill ou historia.
- Mudancas em economia, XP, risco e progressao devem ser pequenas e documentadas no dado/config correspondente.

## 8. Frontend UI

- Componentes devem representar uma responsabilidade clara: tela, painel, card ou controle.
- Evite crescer `App.jsx`; extraia telas como `AuthScreen`, `SaveScreen` e paineis do dashboard quando houver mudanca relevante.
- Botao que dispara chamada remota deve ter estado de loading ou disabled quando necessario.
- Erros de API devem aparecer perto do fluxo afetado.
- Inputs devem ter validacao local minima antes de chamar backend.
- Texto de interface deve ser curto e consistente com o tom do jogo.
- Classes Tailwind repetidas em muitos lugares indicam candidato a componente.

## 9. Backend API

- Use status HTTP coerente:
  - `400` para payload invalido;
  - `401` para token ausente/invalido;
  - `403` para autenticado sem permissao;
  - `404` para recurso inexistente;
  - `409` para conflito de unicidade;
  - `413` para payload acima do limite.
- Resposta de erro deve seguir o formato `{ message: string }`.
- Rotas devem evitar casts amplos. Prefira schemas ou tipos estreitos na borda.
- Consultas que dependem de usuario devem sempre filtrar por `userId`.
- Indices do Mongo devem refletir os principais filtros de consulta.

## 10. Testes e qualidade

### Gates antes de finalizar mudanca

- `npm run build`
- `npm run test -w backend` quando a mudanca tocar backend ou contrato de API.
- Typecheck do backend com `tsc --noEmit` deve ser mantido verde quando o script existir.
- Auditoria de dependencias deve ser avaliada em mudancas de pacotes.

### Testes esperados

- Backend:
  - auth feliz e erros principais;
  - save CRUD;
  - validacao de slot;
  - limite de payload;
  - leaderboard sem vazamento de dados sensiveis.
- Frontend/gameplay:
  - reducer para acoes principais;
  - hidratacao de save legado;
  - extracao de estado persistivel;
  - regras de missao, skill e recrutamento.

### Banco de teste

- Testes nao devem rodar contra banco de producao/desenvolvimento pessoal.
- Use database dedicado de teste, cleanup por suite ou Mongo em memoria.
- Dados criados por teste devem ser isolados e removiveis.

## 11. Dependencias e tooling

- Prefira dependencias ja presentes no projeto.
- Nova dependencia deve justificar:
  - problema concreto que resolve;
  - peso e manutencao;
  - impacto de seguranca;
  - alternativa nativa ou existente.
- Atualizacoes de pacote devem incluir build/testes.
- `npm audit` critico em auth, HTTP server, parser ou banco deve ser tratado com prioridade.
- Scripts de qualidade devem ficar nos `package.json` correspondentes.

## 12. Git e revisao

- Commits devem agrupar mudancas relacionadas.
- Nao misture refactor amplo com mudanca funcional sem necessidade.
- Nao versionar `dist`, `node_modules`, logs ou arquivos `.env`.
- PR ou revisao deve responder:
  - o que mudou;
  - por que mudou;
  - como foi testado;
  - riscos e rollback.

## 13. Definition of Done

Uma tarefa so deve ser considerada pronta quando:

- comportamento pedido foi implementado;
- build passa;
- testes relevantes passam ou a ausencia deles foi justificada;
- erros conhecidos foram documentados;
- contratos de API foram preservados ou atualizados;
- documentacao foi atualizada quando a mudanca altera setup, arquitetura ou fluxo;
- nenhum segredo foi exposto;
- o diff esta focado no problema.

## 14. Checklist rapido

- A mudanca esta no lugar certo da arquitetura?
- Existe validacao para dados externos?
- Algum token, senha ou URI real foi exposto?
- O codigo ficou menor ou mais claro apos a alteracao?
- Existe teste para a regra alterada?
- O build foi executado?
- Alguma dependencia com vulnerabilidade foi introduzida?
- Saves antigos continuam carregando?
