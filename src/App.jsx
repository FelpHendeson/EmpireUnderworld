import { useEffect, useMemo, useReducer } from 'react';
import {
  Building2,
  Crown,
  FolderKanban,
  Map,
  ScrollText,
  Shield,
  Target
} from 'lucide-react';
import {
  calculatePassiveIncome,
  calculateRaidOutcome,
  createInitialState
} from './data/gameData';

const TICK_INTERVAL = 4000;

const reducer = (state, action) => {
  switch (action.type) {
    case 'TICK': {
      const income = calculatePassiveIncome(state.territories);
      const nextResources = {
        cash: state.resources.cash + income.cash,
        influence: state.resources.influence + income.influence,
        respect: state.resources.respect + income.respect
      };

      return {
        ...state,
        resources: nextResources,
        activityLog: [
          `Negócios renderam $${income.cash} e +${income.influence} influência.`,
          ...state.activityLog
        ].slice(0, 8)
      };
    }
    case 'RAID': {
      const { troop, villain, territory } = action.payload;
      const outcome = calculateRaidOutcome({ troop, villain, territory });
      const report = outcome.victory
        ? `Raid bem-sucedido em ${territory.name}. O respeito aumenta.`
        : `Raid falhou em ${territory.name}. Reorganize suas tropas.`;
      return {
        ...state,
        resources: {
          ...state.resources,
          respect: state.resources.respect + (outcome.victory ? 4 : -2)
        },
        activityLog: [report, ...state.activityLog].slice(0, 8)
      };
    }
    default:
      return state;
  }
};

const statAccentClass = {
  'neon-green': 'text-neon-green',
  'neon-blue': 'text-neon-blue',
  'neon-pink': 'text-neon-pink'
};

const StatCard = ({ label, value, accent }) => (
  <div className="glass-panel rounded-2xl p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
    <p className={`mt-2 text-2xl font-semibold ${statAccentClass[accent]}`}>
      {value}
    </p>
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3">
    <div className="rounded-xl bg-white/5 p-2">
      <Icon className="h-5 w-5 text-neon-blue" />
    </div>
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
    </div>
  </div>
);

const App = () => {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  const activeRaidSummary = useMemo(() => {
    const troop = state.troops.find((item) => item.id === state.activeRaid.troopId);
    const villain = state.villains.find((item) => item.id === state.activeRaid.villainId);
    const territory = state.territories.find(
      (item) => item.id === state.activeRaid.targetTerritoryId
    );
    if (!troop || !territory) {
      return null;
    }

    const projected = calculateRaidOutcome({ troop, villain, territory });

    return {
      troop,
      villain,
      territory,
      winChance: Math.round(projected.winChance * 100)
    };
  }, [state]);

  return (
    <div className="min-h-screen bg-noir-950 text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-72 flex-col gap-8 border-r border-white/5 bg-noir-900/80 p-8 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Empire</p>
            <h1 className="text-2xl font-semibold">Underworld</h1>
            <p className="mt-3 text-sm text-white/60">
              Controle os setores, administre os negócios e expanda o domínio.
            </p>
          </div>
          <nav className="space-y-4 text-sm">
            {[
              { label: 'Mapa', icon: Map },
              { label: 'Recrutamento', icon: Shield },
              { label: 'Vilões', icon: Crown },
              { label: 'Inventário', icon: FolderKanban }
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <Icon className="h-4 w-4 text-neon-purple" />
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <div className="space-y-3 rounded-2xl border border-neon-blue/30 bg-noir-800/80 p-4">
            <div className="flex items-center gap-2 text-sm text-neon-blue">
              <ScrollText className="h-4 w-4" />
              <span>Eventos ao vivo</span>
            </div>
            <p className="text-xs text-white/60">
              Encontros inesperados podem elevar a tensão. Esteja pronto para escolher.
            </p>
          </div>
        </aside>

        <main className="flex-1 px-6 py-10 lg:px-12">
          <header className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Painel central</p>
              <h2 className="text-3xl font-semibold">
                Cartel em expansão no submundo neon
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Cash" value={`$${state.resources.cash}`} accent="neon-green" />
              <StatCard
                label="Influência"
                value={`+${state.resources.influence}`}
                accent="neon-blue"
              />
              <StatCard
                label="Respeito"
                value={`+${state.resources.respect}`}
                accent="neon-pink"
              />
            </div>
          </header>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <SectionTitle
                icon={Map}
                title="Mapa de setores"
                subtitle="Cada setor abriga negócios e gera renda passiva."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {state.territories.map((territory) => (
                  <div key={territory.id} className="glass-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{territory.name}</p>
                        <p className="text-xs text-white/50">Defesa {territory.defense}</p>
                      </div>
                      <Target className="h-5 w-5 text-neon-amber" />
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-white/60">
                      {territory.businesses.map((businessId) => {
                        const business = state.businesses.find(
                          (item) => item.id === businessId
                        );
                        return (
                          <div key={businessId} className="flex items-center justify-between">
                            <span>{business?.name}</span>
                            <span className="text-neon-green">
                              +${business?.income.cash ?? 0}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <SectionTitle
                icon={Crown}
                title="Tenentes ativos"
                subtitle="Vilões com buffs estratégicos."
              />
              <div className="space-y-4">
                {state.villains.map((villain) => (
                  <div key={villain.id} className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{villain.name}</p>
                        <p className="text-xs text-white/50">{villain.role}</p>
                      </div>
                      <span className="rounded-full border border-neon-purple/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-neon-purple">
                        {villain.rarity}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-white/60">{villain.buff.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <SectionTitle
                icon={Shield}
                title="Tropas e recrutamento"
                subtitle="Unidades disponíveis para ataques e defesa."
              />
              <div className="space-y-3">
                {state.troops.map((troop) => (
                  <div key={troop.id} className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{troop.name}</p>
                        <p className="text-xs text-white/50">{troop.type}</p>
                      </div>
                      <span className="text-xs text-neon-blue">Upkeep ${troop.upkeep}</span>
                    </div>
                    <p className="mt-2 text-xs text-white/60">{troop.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle
                icon={Target}
                title="Raids táticos"
                subtitle="Simulação rápida de vitória e risco."
              />
              <div className="glass-panel rounded-2xl p-5">
                {activeRaidSummary ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                        Missão ativa
                      </p>
                      <p className="text-lg font-semibold">
                        {activeRaidSummary.territory.name}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Tropa selecionada</span>
                        <span className="text-neon-green">{activeRaidSummary.troop.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tenente</span>
                        <span className="text-neon-purple">
                          {activeRaidSummary.villain?.name ?? 'Nenhum'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Chance de vitória</span>
                        <span className="text-neon-amber">{activeRaidSummary.winChance}%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'RAID',
                          payload: {
                            troop: activeRaidSummary.troop,
                            villain: activeRaidSummary.villain,
                            territory: activeRaidSummary.territory
                          }
                        })
                      }
                      className="w-full rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-2 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/20"
                    >
                      Iniciar raid
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-white/60">Selecione uma missão.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <SectionTitle
              icon={ScrollText}
              title="Log de atividades"
              subtitle="Narrativa recente do submundo."
            />
            <div className="mt-4 space-y-3">
              {state.activityLog.map((entry, index) => (
                <div key={`${entry}-${index}`} className="glass-panel rounded-2xl p-4 text-sm">
                  {entry}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
