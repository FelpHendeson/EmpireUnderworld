import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import {
  BadgeDollarSign,
  CalendarDays,
  Info,
  Map,
  ShieldAlert,
  ShoppingBag,
  Swords,
  Target,
  UserPlus,
  Users
} from 'lucide-react';
import {
  calculateTerritoryIncome,
  createInitialState,
  getNextRank,
  getRankPower,
  rankData
} from './data/gameData';
import { authApi, saveApi } from './services/api';

const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'];
const TOKEN_STORAGE_KEY = 'underworld_auth_token';
const AUTO_SAVE_INTERVAL_MS = 30000;

const createInitialSlotDrafts = () =>
  SLOT_IDS.reduce((acc, slot) => {
    acc[slot] = { playerName: '', saveName: 'Campanha principal' };
    return acc;
  }, {});

const infoContent = {
  resources: {
    title: 'Recursos',
    text: 'Cash sustenta operacoes. Influencia abre portas politicas. Respeito alimenta sua reputacao.'
  },
  map: {
    title: 'Mapa geopolitico',
    text: 'Clique em um bairro para iniciar infiltracao ou disputa territorial.'
  },
  actions: {
    title: 'Acoes estrategicas',
    text: 'Crimes, mercado negro e recrutamento definem sua progressao.'
  }
};

const applyResourceDelta = (resources, delta) => ({
  cash: resources.cash + (delta.cash ?? 0),
  influence: resources.influence + (delta.influence ?? 0),
  respect: resources.respect + (delta.respect ?? 0)
});

const getLevelFromXp = (xp) => 1 + Math.floor(xp / 50);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const updateNeighborhood = (worldMap, ids, updater) =>
  worldMap.map((country) => ({
    ...country,
    states: country.states.map((state) => ({
      ...state,
      cities: state.cities.map((city) => ({
        ...city,
        neighborhoods: city.neighborhoods.map((neighborhood) => {
          if (
            country.id === ids.countryId &&
            state.id === ids.stateId &&
            city.id === ids.cityId &&
            neighborhood.id === ids.neighborhoodId
          ) {
            return updater(neighborhood);
          }
          return neighborhood;
        })
      }))
    }))
  }));

const countRankOrAbove = (members, rank) => {
  const targetPower = getRankPower(rank);
  return members.filter((member) => getRankPower(member.rank) >= targetPower).length;
};

const canCommitCrime = (state, crime) => {
  const requiredItems = crime.requirements?.itemIds ?? [];
  const requiredRanks = crime.requirements?.minRankCounts ?? {};
  const hasItems = requiredItems.every((itemId) => (state.inventory[itemId] ?? 0) > 0);
  const hasRanks = Object.entries(requiredRanks).every(([rank, count]) =>
    countRankOrAbove(state.members, rank) >= count
  );
  return hasItems && hasRanks;
};

const extractSavableState = (state) => ({
  ...state,
  combatReport: null,
  lastTurnSummary: null,
  uiInfoPanel: null
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADVANCE_DAY': {
      const income = calculateTerritoryIncome(state.worldMap);
      const nextResources = applyResourceDelta(state.resources, income);
      return {
        ...state,
        day: state.day + 1,
        resources: nextResources,
        lastTurnSummary: income
      };
    }
    case 'SET_LOCATION': {
      return {
        ...state,
        selectedLocation: action.payload
      };
    }
    case 'ACTION_COMMIT_CRIME': {
      const crime = state.crimes.find((item) => item.id === action.payload.crimeId);
      if (!crime || !canCommitCrime(state, crime)) {
        return state;
      }
      const success = Math.random() > crime.risk;
      const xpGain = success ? crime.rewards.xp : Math.round(crime.rewards.xp / 3);
      const updatedMembers = state.members.map((member, index) =>
        index === 0
          ? {
              ...member,
              xp: member.xp + xpGain,
              level: getLevelFromXp(member.xp + xpGain)
            }
          : member
      );
      return {
        ...state,
        members: updatedMembers,
        resources: applyResourceDelta(
          state.resources,
          success ? crime.rewards : { respect: -1 }
        ),
        activityLog: [
          success
            ? `Crime realizado: ${crime.name}. O caixa aumentou.`
            : `Crime falhou: ${crime.name}. A policia ficou alerta.`,
          ...state.activityLog
        ].slice(0, 12)
      };
    }
    case 'ACTION_BUY_ITEM': {
      const item = state.blackMarket.find((entry) => entry.id === action.payload.itemId);
      if (!item || state.resources.cash < item.price) {
        return state;
      }
      const nextInventory = {
        ...state.inventory,
        [item.id]: (state.inventory[item.id] ?? 0) + 1
      };
      return {
        ...state,
        inventory: nextInventory,
        resources: applyResourceDelta(state.resources, {
          cash: -item.price,
          ...item.effects
        }),
        activityLog: [`Compra no mercado negro: ${item.name}.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_RECRUIT': {
      const recruit = state.recruitPool.find((member) => member.id === action.payload.memberId);
      if (!recruit) {
        return state;
      }
      const entry = recruit.entry;
      if (entry.type === 'cash' && state.resources.cash < entry.value) {
        return state;
      }
      if (entry.type === 'respect' && state.resources.respect < entry.value) {
        return state;
      }
      const nextResources = applyResourceDelta(state.resources, {
        cash: entry.type === 'cash' ? -entry.value : 0,
        respect: entry.type === 'respect' ? -entry.value : 0
      });
      return {
        ...state,
        resources: nextResources,
        members: [...state.members, { ...recruit, entry: undefined }],
        recruitPool: state.recruitPool.filter((member) => member.id !== recruit.id),
        activityLog: [`${recruit.name} entrou na organizacao.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_PROMOTE': {
      const member = state.members.find((item) => item.id === action.payload.memberId);
      if (!member) {
        return state;
      }
      const nextRank = getNextRank(member.rank);
      if (!nextRank) {
        return state;
      }
      const requirements = rankData[nextRank];
      if (!requirements || member.xp < requirements.minXp) {
        return state;
      }
      if (
        state.resources.cash < requirements.promoteCost.cash ||
        state.resources.respect < requirements.promoteCost.respect
      ) {
        return state;
      }
      return {
        ...state,
        resources: applyResourceDelta(state.resources, {
          cash: -requirements.promoteCost.cash,
          respect: -requirements.promoteCost.respect
        }),
        members: state.members.map((item) =>
          item.id === member.id ? { ...item, rank: nextRank } : item
        ),
        activityLog: [`${member.name} foi promovido para ${nextRank}.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_TAKEOVER': {
      const ids = state.selectedLocation;
      let selectedNeighborhood = null;
      state.worldMap.forEach((country) => {
        if (country.id !== ids.countryId) return;
        country.states.forEach((stateItem) => {
          if (stateItem.id !== ids.stateId) return;
          stateItem.cities.forEach((city) => {
            if (city.id !== ids.cityId) return;
            selectedNeighborhood = city.neighborhoods.find(
              (neighborhood) => neighborhood.id === ids.neighborhoodId
            );
          });
        });
      });
      if (!selectedNeighborhood) return state;

      const ourPower = state.members.reduce((total, member) => total + getRankPower(member.rank), 0);
      const enemyPower = selectedNeighborhood.dominantOrg.powerLevel;
      const winChance = clamp(ourPower / (enemyPower + 1), 0.1, 0.9);
      const victory = Math.random() <= winChance;

      const nextPresence =
        selectedNeighborhood.presence === 'Inexistente'
          ? 'Infiltrado'
          : selectedNeighborhood.presence === 'Infiltrado'
            ? 'Disputado'
            : selectedNeighborhood.presence === 'Disputado' && victory
              ? 'Dominado'
              : selectedNeighborhood.presence;

      let absorbedMembers = [];
      if (victory && nextPresence === 'Dominado' && Math.random() < 0.2) {
        const eliteCount = Math.max(1, Math.min(2, selectedNeighborhood.dominantOrg.eliteCount));
        absorbedMembers = Array.from({ length: eliteCount }, () => ({
          id: nanoid(),
          name: 'Elite absorvido',
          rank: 'Elite',
          xp: 400,
          level: 8
        }));
      }

      const updatedWorldMap = updateNeighborhood(state.worldMap, ids, (neighborhood) => ({
        ...neighborhood,
        presence: victory
          ? nextPresence
          : neighborhood.presence === 'Inexistente'
            ? 'Infiltrado'
            : neighborhood.presence
      }));

      const report = `Seus ${countRankOrAbove(state.members, 'Soldado')} Soldados e ${
        countRankOrAbove(state.members, 'Recruta')
      } Recrutas enfrentaram ${enemyPower} capangas da faccao ${selectedNeighborhood.dominantOrg.name}. ${
        victory ? 'Vitoria!' : 'Derrota.'
      }`;

      return {
        ...state,
        worldMap: updatedWorldMap,
        members: absorbedMembers.length ? [...state.members, ...absorbedMembers] : state.members,
        combatReport: report,
        activityLog: [
          victory
            ? `Territorio em ${selectedNeighborhood.name} avancou para ${nextPresence}.`
            : `A tentativa em ${selectedNeighborhood.name} fracassou.`,
          ...state.activityLog
        ].slice(0, 12)
      };
    }
    case 'TOGGLE_INFO': {
      return {
        ...state,
        uiInfoPanel: state.uiInfoPanel === action.payload.panel ? null : action.payload.panel
      };
    }
    case 'HYDRATE_STATE': {
      return {
        ...action.payload,
        combatReport: null,
        lastTurnSummary: null,
        uiInfoPanel: null
      };
    }
    default:
      return state;
  }
};

const InfoButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-white/10 bg-white/5 p-1 text-white/70 transition hover:border-neon-blue/40 hover:text-neon-blue"
  >
    <Info className="h-4 w-4" />
  </button>
);

const ResourceCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-3">
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
      <span>{label}</span>
      <Icon className="h-4 w-4 text-neon-blue" />
    </div>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const AuthScreen = ({ authForm, setAuthForm, handleRegister, handleLogin, apiStatus }) => (
  <div className="relative min-h-screen overflow-hidden bg-black text-white">
    <div className="absolute inset-0 bg-gradient-to-br from-black via-noir-950 to-black" />
    <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-neon-blue/20 blur-3xl" />
    <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-neon-pink/20 blur-3xl" />

    <div className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
      <div className="w-full rounded-3xl border border-white/10 bg-noir-900/70 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.45em] text-white/50">Empire Underworld</p>
        <h1 className="mt-4 text-3xl font-semibold">Acesso a organizacao</h1>
        <p className="mt-2 text-sm text-white/60">Login/registro obrigatorio para entrar no jogo.</p>

        <div className="mt-6 space-y-3">
          <input
            value={authForm.email}
            onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon-blue/50"
          />
          <input
            value={authForm.username}
            onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="Username (somente registro)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon-blue/50"
          />
          <input
            type="password"
            value={authForm.password}
            onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Senha"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon-blue/50"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRegister}
            disabled={apiStatus.loading}
            className="rounded-xl border border-neon-blue/40 bg-neon-blue/10 px-3 py-2 text-sm font-semibold text-neon-blue transition hover:bg-neon-blue/20 disabled:opacity-50"
          >
            Registrar
          </button>
          <button
            type="button"
            onClick={handleLogin}
            disabled={apiStatus.loading}
            className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-3 py-2 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/20 disabled:opacity-50"
          >
            Login
          </button>
        </div>

        {apiStatus.error && <p className="mt-3 text-xs text-red-300">{apiStatus.error}</p>}
      </div>
    </div>
  </div>
);

const SaveScreen = ({
  authUser,
  savesBySlot,
  slotDrafts,
  onSlotDraftChange,
  apiStatus,
  onCreateSave,
  onLoadSave,
  onDeleteSave,
  onLogout
}) => (
  <div className="min-h-screen bg-noir-950 text-white">
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-white/50">Empire Underworld</p>
          <h1 className="mt-3 text-3xl font-semibold">Gerenciamento de Saves</h1>
          <p className="mt-2 text-sm text-white/60">Escolha 1 entre 3 slots para iniciar ou continuar sua campanha.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/70">{authUser?.username}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs transition hover:border-white/30"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {SLOT_IDS.map((slot) => {
          const save = savesBySlot[slot];
          const draft = slotDrafts[slot] ?? { playerName: '', saveName: 'Campanha principal' };
          return (
            <article key={slot} className="rounded-3xl border border-white/10 bg-noir-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">{slot}</p>
              {save ? (
                <>
                  <h3 className="mt-3 text-lg font-semibold">{save.name}</h3>
                  <p className="mt-2 text-xs text-white/60">Dia {save.day}</p>
                  <p className="mt-1 text-xs text-white/60">
                    Cash ${save.resources?.cash ?? 0} | Infl. {save.resources?.influence ?? 0} | Resp. {save.resources?.respect ?? 0}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSave(slot)}
                      disabled={apiStatus.loading}
                      className="rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-3 py-2 text-xs font-semibold text-neon-blue disabled:opacity-50"
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSave(slot)}
                      disabled={apiStatus.loading}
                      className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50"
                    >
                      Apagar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mt-3 text-lg font-semibold">Slot vazio</h3>
                  <div className="mt-4 space-y-2">
                    <input
                      value={draft.playerName}
                      onChange={(event) => onSlotDraftChange(slot, 'playerName', event.target.value)}
                      placeholder="Nome do personagem"
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-neon-blue/50"
                    />
                    <input
                      value={draft.saveName}
                      onChange={(event) => onSlotDraftChange(slot, 'saveName', event.target.value)}
                      placeholder="Nome da campanha"
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-neon-blue/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreateSave(slot)}
                    disabled={apiStatus.loading}
                    className="mt-4 w-full rounded-lg border border-neon-pink/40 bg-neon-pink/10 px-3 py-2 text-xs font-semibold text-neon-pink disabled:opacity-50"
                  >
                    Criar e Entrar
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>

      {apiStatus.error && <p className="mt-5 text-sm text-red-300">{apiStatus.error}</p>}
    </div>
  </div>
);

const App = () => {
  const [state, dispatch] = useReducer(reducer, null, () => createInitialState('Jogador'));
  const [screen, setScreen] = useState('auth');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
  const [authUser, setAuthUser] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '' });
  const [slotDrafts, setSlotDrafts] = useState(createInitialSlotDrafts);
  const [activeSlot, setActiveSlot] = useState(null);
  const [activeSaveName, setActiveSaveName] = useState('Campanha principal');
  const [cloudSaves, setCloudSaves] = useState([]);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: '' });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const selectedContext = useMemo(() => {
    const country = state.worldMap.find((item) => item.id === state.selectedLocation.countryId);
    const stateItem = country?.states.find((item) => item.id === state.selectedLocation.stateId);
    const city = stateItem?.cities.find((item) => item.id === state.selectedLocation.cityId);
    const neighborhood = city?.neighborhoods.find(
      (item) => item.id === state.selectedLocation.neighborhoodId
    );
    return { country, stateItem, city, neighborhood };
  }, [state.worldMap, state.selectedLocation]);

  const activeState = selectedContext.stateItem;
  const activeCity = selectedContext.city;

  const itemNameMap = useMemo(() => {
    const map = {};
    state.blackMarket.forEach((item) => {
      map[item.id] = item.name;
    });
    return map;
  }, [state.blackMarket]);

  const savesBySlot = useMemo(() => {
    const map = {};
    cloudSaves.forEach((save) => {
      map[save.slot] = save;
    });
    return map;
  }, [cloudSaves]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [authToken]);

  const refreshSaves = async (token) => {
    const data = await saveApi.list(token);
    setCloudSaves(data.saves ?? []);
  };

  const updateSlotDraft = (slot, field, value) => {
    setSlotDrafts((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value
      }
    }));
  };

  const saveCurrentProgress = async ({ silent = false } = {}) => {
    if (!authToken || !activeSlot || screen !== 'game') {
      return false;
    }

    try {
      if (!silent) {
        setApiStatus({ loading: true, error: '' });
      }
      await saveApi.save(authToken, activeSlot, {
        name: activeSaveName || `Campanha ${activeSlot}`,
        state: extractSavableState(stateRef.current)
      });
      await refreshSaves(authToken);
      if (!silent) {
        setApiStatus({ loading: false, error: '' });
      }
      return true;
    } catch (error) {
      if (!silent) {
        setApiStatus({ loading: false, error: error.message });
      }
      return false;
    }
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!authToken) {
        setAuthUser(null);
        setCloudSaves([]);
        setActiveSlot(null);
        setActiveSaveName('Campanha principal');
        setScreen('auth');
        return;
      }

      try {
        setApiStatus({ loading: true, error: '' });
        const me = await authApi.me(authToken);
        setAuthUser(me.user);
        await refreshSaves(authToken);
        setScreen('saves');
        setApiStatus({ loading: false, error: '' });
      } catch (error) {
        setApiStatus({ loading: false, error: error.message });
        setAuthToken('');
        setAuthUser(null);
        setCloudSaves([]);
        setActiveSlot(null);
        setActiveSaveName('Campanha principal');
        setScreen('auth');
      }
    };

    bootstrapSession();
  }, [authToken]);

  const handleRegister = async () => {
    try {
      setApiStatus({ loading: true, error: '' });
      const response = await authApi.register(authForm);
      setAuthToken(response.token);
      setAuthUser(response.user);
      setApiStatus({ loading: false, error: '' });
      setAuthForm((prev) => ({ ...prev, password: '' }));
      setScreen('saves');
    } catch (error) {
      setApiStatus({ loading: false, error: error.message });
    }
  };

  const handleLogin = async () => {
    try {
      setApiStatus({ loading: true, error: '' });
      const response = await authApi.login({
        email: authForm.email,
        password: authForm.password
      });
      setAuthToken(response.token);
      setAuthUser(response.user);
      setApiStatus({ loading: false, error: '' });
      setAuthForm((prev) => ({ ...prev, password: '' }));
      setScreen('saves');
    } catch (error) {
      setApiStatus({ loading: false, error: error.message });
    }
  };

  const handleLogout = async () => {
    await saveCurrentProgress({ silent: true });
    setAuthToken('');
    setAuthUser(null);
    setCloudSaves([]);
    setActiveSlot(null);
    setActiveSaveName('Campanha principal');
    setSlotDrafts(createInitialSlotDrafts());
    dispatch({ type: 'HYDRATE_STATE', payload: createInitialState('Jogador') });
    setScreen('auth');
    setApiStatus({ loading: false, error: '' });
  };

  const handleCreateSave = async (slot) => {
    if (!authToken) return;
    const draft = slotDrafts[slot] ?? { playerName: '', saveName: 'Campanha principal' };
    const normalizedPlayerName = draft.playerName.trim();
    if (!normalizedPlayerName) {
      setApiStatus({ loading: false, error: 'Informe o nome do personagem para comecar.' });
      return;
    }

    try {
      setApiStatus({ loading: true, error: '' });
      const freshState = createInitialState(normalizedPlayerName);
      const campaignName = draft.saveName.trim() || `Campanha ${slot}`;
      await saveApi.save(authToken, slot, {
        name: campaignName,
        state: extractSavableState(freshState)
      });
      await refreshSaves(authToken);
      dispatch({ type: 'HYDRATE_STATE', payload: freshState });
      setActiveSlot(slot);
      setActiveSaveName(campaignName);
      setScreen('game');
      setApiStatus({ loading: false, error: '' });
    } catch (error) {
      setApiStatus({ loading: false, error: error.message });
    }
  };

  const handleLoadFromCloud = async (slot) => {
    if (!authToken) return;
    try {
      setApiStatus({ loading: true, error: '' });
      const data = await saveApi.load(authToken, slot);
      dispatch({ type: 'HYDRATE_STATE', payload: data.save.state });
      setActiveSlot(slot);
      setActiveSaveName(data.save.name || `Campanha ${slot}`);
      setScreen('game');
      setApiStatus({ loading: false, error: '' });
    } catch (error) {
      setApiStatus({ loading: false, error: error.message });
    }
  };

  const handleDeleteSave = async (slot) => {
    if (!authToken) return;
    try {
      setApiStatus({ loading: true, error: '' });
      await saveApi.remove(authToken, slot);
      await refreshSaves(authToken);
      if (activeSlot === slot) {
        setActiveSlot(null);
        setActiveSaveName('Campanha principal');
      }
      setApiStatus({ loading: false, error: '' });
    } catch (error) {
      setApiStatus({ loading: false, error: error.message });
    }
  };

  useEffect(() => {
    if (screen !== 'game' || !authToken || !activeSlot) {
      return undefined;
    }

    const timer = setInterval(() => {
      saveCurrentProgress({ silent: true });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [screen, authToken, activeSlot, activeSaveName]);

  if (screen === 'auth') {
    return (
      <AuthScreen
        authForm={authForm}
        setAuthForm={setAuthForm}
        handleRegister={handleRegister}
        handleLogin={handleLogin}
        apiStatus={apiStatus}
      />
    );
  }

  if (screen === 'saves') {
    return (
      <SaveScreen
        authUser={authUser}
        savesBySlot={savesBySlot}
        slotDrafts={slotDrafts}
        onSlotDraftChange={updateSlotDraft}
        apiStatus={apiStatus}
        onCreateSave={handleCreateSave}
        onLoadSave={handleLoadFromCloud}
        onDeleteSave={handleDeleteSave}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-noir-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-white/40">Empire Underworld</p>
              <h1 className="text-3xl font-semibold">RPG geopolitico criminal</h1>
              <p className="mt-2 text-sm text-white/60">Progresso por reputacao, itens e controle territorial.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-white/10 bg-noir-900/70 px-3 py-2 text-xs text-white/60">
                Slot: {activeSlot ?? '-'}
              </span>
              <button
                type="button"
                onClick={() => setScreen('saves')}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-white/30"
              >
                Saves
              </button>
              <button
                type="button"
                onClick={() => saveCurrentProgress()}
                disabled={apiStatus.loading || !activeSlot}
                className="rounded-xl border border-neon-amber/40 bg-neon-amber/10 px-3 py-2 text-xs font-semibold text-neon-amber transition hover:bg-neon-amber/20 disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-white/30"
              >
                Sair
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-noir-900/70 px-4 py-2">
                <CalendarDays className="h-4 w-4 text-neon-blue" />
                <span className="text-sm">Dia {state.day}</span>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADVANCE_DAY' })}
                className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-5 py-2 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/20"
              >
                Avancar Dia
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Recursos</p>
            <InfoButton onClick={() => dispatch({ type: 'TOGGLE_INFO', payload: { panel: 'resources' } })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ResourceCard label="Cash" value={`$${state.resources.cash}`} icon={BadgeDollarSign} />
            <ResourceCard label="Influencia" value={`+${state.resources.influence}`} icon={ShieldAlert} />
            <ResourceCard label="Respeito" value={`+${state.resources.respect}`} icon={Swords} />
          </div>
        </header>

        {state.lastTurnSummary && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-3 text-sm text-white/70">
            Historico de Turno: +${state.lastTurnSummary.cash} cash, +{state.lastTurnSummary.influence} influencia, +{state.lastTurnSummary.respect} respeito.
          </section>
        )}

        {state.combatReport && (
          <section className="mt-6 rounded-2xl border border-neon-amber/40 bg-neon-amber/10 px-4 py-3 text-sm text-neon-amber">
            Combat Report: {state.combatReport}
          </section>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Mapa geopolitico</h2>
              <InfoButton onClick={() => dispatch({ type: 'TOGGLE_INFO', payload: { panel: 'map' } })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {state.worldMap[0].states.map((stateItem) => (
                <button
                  key={stateItem.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_LOCATION',
                      payload: {
                        countryId: 'br',
                        stateId: stateItem.id,
                        cityId: stateItem.cities[0].id,
                        neighborhoodId: stateItem.cities[0].neighborhoods[0].id
                      }
                    })
                  }
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    activeState?.id === stateItem.id
                      ? 'border-neon-blue/60 bg-neon-blue/10'
                      : 'border-white/10 bg-noir-900/70 hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{stateItem.name}</p>
                  <p className="text-xs text-white/60">{stateItem.cities.length} cidades</p>
                </button>
              ))}
            </div>

            {activeCity && (
              <div className="grid gap-3 md:grid-cols-2">
                {activeCity.neighborhoods.map((neighborhood) => (
                  <button
                    key={neighborhood.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'SET_LOCATION',
                        payload: {
                          countryId: 'br',
                          stateId: activeState.id,
                          cityId: activeCity.id,
                          neighborhoodId: neighborhood.id
                        }
                      })
                    }
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedContext.neighborhood?.id === neighborhood.id
                        ? 'border-neon-pink/60 bg-neon-pink/10'
                        : 'border-white/10 bg-noir-900/70 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{neighborhood.name}</p>
                      <Map className="h-4 w-4 text-neon-blue" />
                    </div>
                    <p className="mt-2 text-xs text-white/60">Dominante: {neighborhood.dominantOrg.name}</p>
                    <p className="mt-1 text-xs text-neon-pink">Presenca: {neighborhood.presence}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedContext.neighborhood && (
              <div className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4 text-sm text-white/70">
                Bairro selecionado: <span className="text-white">{selectedContext.neighborhood.name}</span>. Dominante: {selectedContext.neighborhood.dominantOrg.name}.
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'ACTION_TAKEOVER' })}
                    className="rounded-xl border border-neon-blue/40 bg-neon-blue/10 px-4 py-2 text-xs font-semibold text-neon-blue transition hover:bg-neon-blue/20"
                  >
                    Disputar territorio
                  </button>
                  <span className="text-xs text-white/50">Power inimigo: {selectedContext.neighborhood.dominantOrg.powerLevel}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Acoes estrategicas</h2>
              <InfoButton onClick={() => dispatch({ type: 'TOGGLE_INFO', payload: { panel: 'actions' } })} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-neon-pink" />
                Crimes
              </div>
              <div className="mt-3 grid gap-2">
                {state.crimes.map((crime) => {
                  const allowed = canCommitCrime(state, crime);
                  return (
                    <button
                      key={crime.id}
                      type="button"
                      disabled={!allowed}
                      onClick={() =>
                        dispatch({
                          type: 'ACTION_COMMIT_CRIME',
                          payload: { crimeId: crime.id }
                        })
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:border-neon-pink/40 hover:bg-neon-pink/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {crime.name} (Tier {crime.tier})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="h-4 w-4 text-neon-blue" />
                Mercado negro
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                {state.blackMarket.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'ACTION_BUY_ITEM',
                          payload: { itemId: item.id }
                        })
                      }
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:border-neon-blue/40 hover:text-neon-blue"
                    >
                      ${item.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="h-4 w-4 text-neon-amber" />
                Recrutamento
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                {state.recruitPool.length === 0 && <p className="text-white/60">Nenhum candidato disponivel.</p>}
                {state.recruitPool.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'ACTION_RECRUIT',
                        payload: { memberId: member.id }
                      })
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:border-neon-amber/40 hover:bg-neon-amber/10"
                  >
                    {member.name} - exige {member.entry.type === 'cash' ? `$${member.entry.value}` : `${member.entry.value} respeito`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-neon-blue" />
              Roster e patentes
            </div>
            <div className="grid gap-2">
              {state.members.map((member) => {
                const nextRank = getNextRank(member.rank);
                const requirements = nextRank ? rankData[nextRank] : null;
                const canPromote =
                  Boolean(nextRank) &&
                  Boolean(requirements) &&
                  member.xp >= requirements.minXp &&
                  state.resources.cash >= requirements.promoteCost.cash &&
                  state.resources.respect >= requirements.promoteCost.respect;
                return (
                  <div key={member.id} className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-xs text-white/60">{member.rank} - XP {member.xp}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!canPromote}
                        onClick={() =>
                          dispatch({
                            type: 'ACTION_PROMOTE',
                            payload: { memberId: member.id }
                          })
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:border-neon-blue/40 hover:text-neon-blue disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Promover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4 text-sm text-white/70">
            <p className="font-semibold text-white">Inventario</p>
            {Object.keys(state.inventory).length === 0 && <p className="text-white/50">Sem itens no momento.</p>}
            {Object.entries(state.inventory).map(([itemId, quantity]) => (
              <div key={itemId} className="flex items-center justify-between">
                <span>{itemNameMap[itemId] ?? itemId}</span>
                <span>x{quantity}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Linha do tempo</h2>
          <div className="mt-4 space-y-3">
            {state.activityLog.map((entry, index) => (
              <div key={`${entry}-${index}`} className="rounded-2xl border border-white/10 bg-noir-900/70 px-4 py-4 text-sm">
                {entry}
              </div>
            ))}
          </div>
        </section>

        {state.uiInfoPanel && (
          <section className="mt-10 rounded-2xl border border-neon-blue/30 bg-noir-900/80 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{infoContent[state.uiInfoPanel].title}</p>
                <p className="mt-2 text-xs text-white/60">{infoContent[state.uiInfoPanel].text}</p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_INFO', payload: { panel: state.uiInfoPanel } })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                Fechar
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
