import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Zap, 
  Brain, 
  Terminal, 
  Play, 
  Pause, 
  Server,
  RefreshCw,
  Dna,
  Wifi,
  WifiOff,
  MessageSquare,
  Radio,
  Loader2,
  CheckCircle2,
  User as UserIcon,
  Skull 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Line } from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- TYPE DEFINITIONS ---

type MarketRegime = 'LOW_VOL_RANGE' | 'BULL_TREND' | 'BEAR_TREND' | 'HIGH_VOL_CHOP' | 'FLASH_CRASH';
type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

interface Signal {
  id: string;
  brain: string;
  timestamp: number;
  symbol: string;
  direction: SignalDirection;
  confidence: number;
  entry_price: number;
  tp: number;
  sl: number;
  size: number;
  regime: MarketRegime;
  reason: string;
}

interface BrainState {
  id: string;
  name: string;
  status: 'ACTIVE' | 'REFLECTING' | 'COOLDOWN';
  balance: number;
  trades_won: number;
  trades_lost: number;
  lastSignal: string;
  current_thought: string;
  description: string;
  color: string;
  strategy_bias: string;
  base_aggression: number;
  adaptive_mod: number;
  confidence_threshold: number;
  learning_generation: number;
  dna_weights?: Record<string, number>;
}

// --- CONFIGURATION ---

const INITIAL_CAPITAL = 100;

// YOUR FIREBASE CONFIGURATION (Integrated)
const firebaseConfig = {
  apiKey: "AIzaSyAwwFWF0FScFWKTvteUDgVQFJ3dbh8VxGY",
  authDomain: "aegis-hermes.firebaseapp.com",
  projectId: "aegis-hermes",
  storageBucket: "aegis-hermes.firebasestorage.app",
  messagingSenderId: "623564992158",
  appId: "1:623564992158:web:3636d7c063b27c4f50d58f",
  measurementId: "G-2F6FGJMQ85"
};

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Logic Namespace for DB Paths
const APP_NAMESPACE = 'aegis-core-v1'; 

const DEFAULT_BRAINS: BrainState[] = [
  { id: 'b_rotter', name: 'Paul Rotter', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Calibrating L2 feed...', description: 'HFT/Order Book', color: '#10b981', strategy_bias: 'hft', base_aggression: 0.9, adaptive_mod: 0, confidence_threshold: 0.85, learning_generation: 0 },
  { id: 'b_volman', name: 'Bob Volman', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Measuring tick volatility...', description: 'Fractal Price Action', color: '#3b82f6', strategy_bias: 'scalp', base_aggression: 0.6, adaptive_mod: 0, confidence_threshold: 0.80, learning_generation: 0 },
  { id: 'b_brooks', name: 'Al Brooks', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Waiting for bar close...', description: 'Probabilistic', color: '#f59e0b', strategy_bias: 'swing', base_aggression: 0.4, adaptive_mod: 0, confidence_threshold: 0.75, learning_generation: 0 },
  { id: 'b_diamond', name: 'Matt Diamond', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Calculating VWAP deviation...', description: 'Volume/Zones', color: '#8b5cf6', strategy_bias: 'scalp', base_aggression: 0.5, adaptive_mod: 0, confidence_threshold: 0.82, learning_generation: 0 },
  { id: 'b_hougaard', name: 'Tom Hougaard', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Checking momentum slope...', description: 'Momentum', color: '#ec4899', strategy_bias: 'swing', base_aggression: 0.8, adaptive_mod: 0, confidence_threshold: 0.88, learning_generation: 0 },
  { id: 'b_medhat', name: 'Momen Medhat', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Scanning regime state...', description: 'Adaptive', color: '#06b6d4', strategy_bias: 'scalp', base_aggression: 0.5, adaptive_mod: 0, confidence_threshold: 0.80, learning_generation: 0 },
  { id: 'b_criminal', name: 'The Criminal', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Scanning for liquidity voids...', description: 'Stop Hunter/Exploit', color: '#e11d48', strategy_bias: 'criminal', base_aggression: 0.95, adaptive_mod: 0, confidence_threshold: 0.58, learning_generation: 0 },
  { 
    id: 'b_singularity', name: 'The Singularity', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Synthesizing...', current_thought: 'Analyzing swarm intelligence...', description: 'Meta-Evolutionary', color: '#ffffff', strategy_bias: 'meta', base_aggression: 0.1, adaptive_mod: 0, confidence_threshold: 0.70, learning_generation: 1,
    dna_weights: { 'b_rotter': 0.14, 'b_volman': 0.14, 'b_brooks': 0.14, 'b_diamond': 0.14, 'b_hougaard': 0.14, 'b_medhat': 0.14, 'b_criminal': 0.16 }
  },
];

export default function AegisHermesEngine() {
  const [active, setActive] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'ERROR'>('CONNECTING');
  const [dataLoaded, setDataLoaded] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Mutable Refs for Logic
  const priceDataRef = useRef<{time: string, price: number, vwap: number}[]>([]);
  const evolutionTickRef = useRef(0);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Data
  const [priceData, setPriceData] = useState<{time: string, price: number, vwap: number}[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  
  // Engine
  const [brains, setBrains] = useState<BrainState[]>(DEFAULT_BRAINS);
  const [logs, setLogs] = useState<{time: string, source: string, msg: string, type: string}[]>([]);
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { priceDataRef.current = priceData; }, [priceData]);

  // --- 1. AUTH & PERSISTENCE ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth Error:", e);
        addLog('SYSTEM', 'Authentication Failed. Check Console.', 'error');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
    return () => unsubscribe();
  }, []);

  // --- 2. LOAD DATA ---
  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', APP_NAMESPACE, 'users', user.uid, 'aegis_data', 'brains_state_v4');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.brains) {
          setBrains(prev => {
             const merged = DEFAULT_BRAINS.map(def => {
                const saved = data.brains.find((b: any) => b.id === def.id);
                if (saved) {
                   const newBrain = { ...def, ...saved };
                   if (def.id === 'b_singularity' && !saved.dna_weights) newBrain.dna_weights = def.dna_weights;
                   return newBrain;
                }
                return def;
             });
             return merged;
          });
          setDataLoaded(true);
          addLog('DATABASE', 'Neural State Synchronized.', 'success');
        }
      } else {
        setDoc(docRef, { brains: DEFAULT_BRAINS, last_updated: Date.now() });
        setDataLoaded(true);
        addLog('DATABASE', 'Profile Initialized.', 'info');
      }
    });
    return () => unsub();
  }, [user]);

  const triggerSave = (newBrains: BrainState[]) => {
    if (!user || !db || !dataLoaded) return; 
    setIsSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'artifacts', APP_NAMESPACE, 'users', user.uid, 'aegis_data', 'brains_state_v4');
        const sanitizedBrains = newBrains.map(({ current_thought, ...rest }) => rest);
        await setDoc(docRef, { brains: sanitizedBrains, last_updated: Date.now() }, { merge: true });
        setIsSaving(false);
      } catch (e) {
        setIsSaving(false);
        addLog('DATABASE', 'Save Failed!', 'error');
      }
    }, 200); 
  };

  useEffect(() => {
    const handleUnload = () => { if (isSaving) {} };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isSaving]);

  const addLog = (source: string, msg: string, type: 'info'|'success'|'warn'|'error'|'trade'|'evolve'|'dna' = 'info') => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3}),
      source,
      msg,
      type
    }, ...prev.slice(0, 49)]);
  };

  // --- 3. WEBSOCKET ---
  useEffect(() => {
    if (!active || !dataLoaded) {
       if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
       if (active && !dataLoaded) addLog('SYSTEM', 'Waiting for DB Sync...', 'warn');
       setConnectionStatus('CONNECTING');
       return;
    }

    const connectWS = () => {
        addLog('NETWORK', 'Opening WebSocket...', 'info');
        const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionStatus('LIVE');
            addLog('NETWORK', 'Live Ticker Active.', 'success');
            ws.send(JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'ticker' && data.price) {
                const price = parseFloat(data.price);
                setCurrentPrice(price);
                setPriceData(prev => {
                    const lastVwap = prev.length > 0 ? prev[prev.length-1].vwap : price;
                    const newPoint = {
                        time: new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'}),
                        price: price,
                        vwap: (lastVwap * 0.99) + (price * 0.01)
                    };
                    const newData = [...prev, newPoint];
                    if (newData.length > 50) newData.shift();
                    return newData;
                });
                processBrains(price);
            }
        };

        ws.onerror = () => { setConnectionStatus('ERROR'); };
        ws.onclose = () => { if (active) setTimeout(connectWS, 1000); };
    };

    connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [active, dataLoaded]);

  // --- 4. LOGIC & EXECUTION ---
  const generateThought = (brain: BrainState, price: number, vwap: number): string => {
     if (brain.status === 'REFLECTING') return 'Analyzing loss pattern...';
     const diff = price - vwap;

     if (brain.name === 'Paul Rotter') {
        const imb = (Math.random() * 0.5 + 0.3).toFixed(2);
        return `Scanning L2... Imbalance: ${imb}`;
     }
     if (brain.name === 'Bob Volman') return `Price action tight. Range: ${(price * 0.0001).toFixed(1)}`;
     if (brain.name === 'Al Brooks') return diff > 0 ? 'Bull channel.. wait for PB' : 'Bear channel.. wait for L2';
     if (brain.name === 'Matt Diamond') return diff > 25 ? `Price > VWAP (+${diff.toFixed(0)}). Overextended.` : diff < -25 ? `Price < VWAP (${diff.toFixed(0)}). Value.` : 'Equilibrium.';
     if (brain.name === 'Tom Hougaard') return 'Scanning momentum slope...';
     if (brain.name === 'Momen Medhat') return `Adaptive Mod: ${brain.adaptive_mod.toFixed(2)}. Regime: LOW_VOL`;
     if (brain.id === 'b_criminal') {
         const tactics = ['Stop cluster detected', 'Front-running retail', 'Buying support', 'Fake breakout fade', 'Whale shadow', 'Inducing FOMO', 'Liquidity void', 'Sniping weak hands'];
         return tactics[Math.floor(Math.random() * tactics.length)];
     }
     if (brain.id === 'b_singularity') {
         const weights = brain.dna_weights || {};
         const topLink = Object.entries(weights).sort((a,b) => b[1] - a[1])[0];
         return `DNA Focus: ${topLink ? topLink[0].replace('b_', '') : 'None'} (${((topLink?.[1]||0)*100).toFixed(0)}%)`;
     }
     return 'Standing by...';
  };

  const processBrains = (price: number) => {
    if (panicMode || !dataLoaded) return;
    
    const currentPriceData = priceDataRef.current;
    const vwap = currentPriceData.length > 0 ? currentPriceData[currentPriceData.length-1].vwap : price;
    evolutionTickRef.current += 1;

    setBrains(prevBrains => {
      let currentBrains = [...prevBrains];
      let hasEvolved = false;

      // Evolution
      if (evolutionTickRef.current % 50 === 0) {
          const singularity = currentBrains.find(b => b.id === 'b_singularity');
          if (singularity && singularity.dna_weights) {
             const newWeights = { ...singularity.dna_weights };
             let changed = false;
             currentBrains.forEach(b => {
                 if (b.id === 'b_singularity') return;
                 const weight = newWeights[b.id] || 0.14; 
                 const profit = b.balance - INITIAL_CAPITAL;
                 if (profit > 5 && weight < 0.40) { newWeights[b.id] = weight + 0.01; changed = true; }
                 if (profit < -5 && weight > 0.05) { newWeights[b.id] = weight - 0.01; changed = true; }
             });
             if (changed) {
                 const total = Object.values(newWeights).reduce((a,b)=>a+b,0);
                 Object.keys(newWeights).forEach(k => newWeights[k] = parseFloat((newWeights[k]/total).toFixed(3)));
                 currentBrains = currentBrains.map(b => b.id === 'b_singularity' ? { ...b, dna_weights: newWeights, learning_generation: b.learning_generation + 1 } : b);
                 hasEvolved = true;
                 addLog('SINGULARITY', 'Neural weights evolved.', 'dna');
             }
          }
      }

      // Thoughts & Trading
      currentBrains = currentBrains.map(b => ({ ...b, current_thought: generateThought(b, price, vwap) }));

      if (Math.random() > 0.95) { 
          currentBrains = currentBrains.map(brain => {
            if (brain.status !== 'ACTIVE') return brain;
            let shouldFire = false;
            let dir: SignalDirection = 'NEUTRAL';
            let reason = '';
            const rand = Math.random();

            if (brain.name === 'Paul Rotter' && rand > 0.97) { shouldFire=true; dir=Math.random()>0.5?'LONG':'SHORT'; reason='Order Flow'; }
            if (brain.name === 'Bob Volman' && rand > 0.98) { shouldFire=true; dir=price>vwap?'LONG':'SHORT'; reason='Breakout'; }
            if (brain.name === 'Al Brooks' && rand > 0.97) { shouldFire=true; dir=Math.random()>0.5?'LONG':'SHORT'; reason='Setup'; }
            if (brain.name === 'Matt Diamond') { if (price > vwap + 25 && rand > 0.95) { shouldFire=true; dir='SHORT'; reason='VWAP Fade'; } if (price < vwap - 25 && rand > 0.95) { shouldFire=true; dir='LONG'; reason='VWAP Bounce'; } }
            if (brain.name === 'Tom Hougaard' && rand > 0.98) { shouldFire=true; dir=price>vwap?'LONG':'SHORT'; reason='Trend Add'; }
            if (brain.name === 'Momen Medhat' && rand > 0.97) { shouldFire=true; dir=Math.random()>0.5?'LONG':'SHORT'; reason='Regime'; }
            if (brain.id === 'b_criminal' && rand > 0.94) { shouldFire=true; dir=Math.random()>0.5?'LONG':'SHORT'; reason='Liquidity Grab'; }
            
            if (brain.id === 'b_singularity' && rand > 0.96) {
                let sentimentScore = 0;
                if (brain.dna_weights) {
                    prevBrains.forEach(b => {
                        if (b.id === 'b_singularity') return;
                        const w = brain.dna_weights![b.id] || 0;
                        const bProfit = b.balance - INITIAL_CAPITAL;
                        if (bProfit > 0) sentimentScore += (price > vwap ? 1 : -1) * w;
                    });
                }
                if (Math.abs(sentimentScore) > 0.1) { shouldFire=true; dir=sentimentScore>0?'LONG':'SHORT'; reason=`DNA (${sentimentScore.toFixed(2)})`; } 
                else if (rand > 0.99) { shouldFire=true; dir=Math.random()>0.5?'LONG':'SHORT'; reason='Exploration'; }
            }

            if (shouldFire && dir !== 'NEUTRAL') { fireSignal(brain, dir, price, reason); }
            return brain;
          });
      }
      
      if (hasEvolved) triggerSave(currentBrains);
      return currentBrains;
    });

    setActiveSignals(prev => {
        const surviving: Signal[] = [];
        prev.forEach(sig => {
            let close = false;
            let result: 'WIN'|'LOSS'|null = null;
            if (sig.direction === 'LONG') { if (price >= sig.tp) { close=true; result='WIN'; } else if (price <= sig.sl) { close=true; result='LOSS'; } } 
            else { if (price <= sig.tp) { close=true; result='WIN'; } else if (price >= sig.sl) { close=true; result='LOSS'; } }

            if (close) {
                const pnl = result === 'WIN' ? 1.5 : -1.0; 
                addLog('EXCHANGE', `${sig.brain} CLOSED ${result} ($${pnl})`, result==='WIN'?'success':'error');
                setBrains(curr => {
                    const newB = curr.map(b => {
                        if (b.name === sig.brain) {
                            return { ...b, balance: b.balance + pnl, trades_won: result==='WIN'?b.trades_won+1:b.trades_won, trades_lost: result==='LOSS'?b.trades_lost+1:b.trades_lost };
                        }
                        return b;
                    });
                    triggerSave(newB); 
                    return newB;
                });
            } else {
                surviving.push(sig);
            }
        });
        return surviving;
    });
  };

  const fireSignal = (brain: BrainState, dir: SignalDirection, price: number, reason: string) => {
      if (activeSignals.filter(s => s.brain === brain.name).length >= 1) return; 
      const tp = 50, sl = 50; 
      const signal: Signal = { id: Math.random().toString(36).substr(2, 9), brain: brain.name, timestamp: Date.now(), symbol: 'BTC/USD', direction: dir, confidence: brain.confidence_threshold, entry_price: price, tp: price + (dir === 'LONG' ? tp : -tp), sl: price + (dir === 'LONG' ? -sl : sl), size: 100, regime: 'LOW_VOL_RANGE', reason };
      setActiveSignals(prev => [signal, ...prev]);
      addLog(brain.name, `${dir} | ${reason}`, brain.id === 'b_singularity' ? 'dna' : 'trade');
  };

  // --- RENDER ---
  const sortedBrains = [...brains].sort((a, b) => b.balance - a.balance);
  const singularityBrain = brains.find(b => b.id === 'b_singularity');

  return (
    <div className="flex flex-col h-screen bg-black text-green-500 font-mono overflow-hidden selection:bg-green-900 selection:text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-green-900 bg-gray-900/50 flex-none h-14">
        <div className="flex items-center gap-3">
          <Brain className={active ? "text-green-500 animate-pulse" : "text-gray-500"} />
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">AEGIS HERMES <span className="text-xs text-blue-400">DEPLOYED</span></h1>
            <div className="flex gap-2 text-[10px] text-gray-400">
               <span className={connectionStatus === 'LIVE' ? "text-green-400 animate-pulse" : "text-red-400"}>
                 {connectionStatus === 'LIVE' ? "● TICKER ACTIVE" : "○ TICKER STOPPED"}
               </span>
               <span className={dataLoaded ? "text-green-400" : "text-yellow-500 flex items-center gap-1"}>
                  | {dataLoaded ? "● DB SYNCED" : <><Loader2 size={8} className="animate-spin"/> SYNCING DB...</>}
               </span>
               <span className="flex items-center gap-1 min-w-[60px]">
                  | {isSaving ? <span className="text-yellow-400 flex items-center gap-1"><RefreshCw size={8} className="animate-spin"/> SAVING...</span> : <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 size={8}/> SAVED</span>}
               </span>
               <span className="flex items-center gap-1 text-gray-500 border-l border-gray-800 pl-2 ml-1">
                   <UserIcon size={8} /> {user ? user.uid.slice(0, 6) : '...'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setActive(!active)}
            disabled={!dataLoaded}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition-all 
                ${!dataLoaded ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 
                  active ? 'bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900/50' : 
                  'bg-green-900/30 text-green-400 border border-green-900 hover:bg-green-900/50'}`}
          >
            {active ? <Pause size={16} /> : <Play size={16} />}
            {!dataLoaded ? 'LOADING DB...' : active ? 'DISCONNECT FEED' : 'CONNECT FEED'}
          </button>
        </div>
      </header>

      {/* DASHBOARD */}
      <div className="flex-1 grid grid-cols-12 gap-1 p-2 bg-gray-950 overflow-hidden">
        {/* LEFT: BRAINS */}
        <div className="col-span-5 flex flex-col gap-1 overflow-hidden h-full">
           <div className="bg-gray-900 border border-purple-900/50 p-2 rounded-sm mb-1 flex-none">
             <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-2"><Dna size={12}/> SINGULARITY DNA</span>
                <span className="text-[9px] text-gray-500">GEN: {singularityBrain?.learning_generation}</span>
             </div>
             <div className="grid grid-cols-3 gap-1">
                {singularityBrain?.dna_weights && Object.entries(singularityBrain.dna_weights).map(([key, val]) => (
                   <div key={key} className="bg-black/50 p-1 rounded border border-gray-800 text-[8px] flex flex-col items-center">
                      <span className="text-gray-500">{key.replace('b_', '').toUpperCase().slice(0,5)}</span>
                      <span className="text-purple-300 font-bold">{(val * 100).toFixed(1)}%</span>
                      <div className="w-full h-0.5 bg-gray-800 mt-1">
                         <div className="h-full bg-purple-500 transition-all duration-500" style={{width: `${val*200}%`}}></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <div className="bg-gray-900 border border-green-900/30 p-2 rounded-sm flex justify-between items-center flex-none">
             <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><Radio size={12}/> NEURAL TELEMETRY</span>
          </div>
          <div className="flex-1 bg-gray-900 border border-green-900/30 p-2 rounded-sm overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 gap-2">
              {sortedBrains.map((brain, idx) => {
                const profit = brain.balance - INITIAL_CAPITAL;
                const isProfitable = profit >= 0;
                return (
                  <div key={brain.id} className={`border p-2 rounded relative overflow-hidden transition-all duration-300 ${brain.status === 'REFLECTING' ? 'bg-blue-900/20 border-blue-800' : 'bg-black/40 border-gray-800'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                          {brain.id === 'b_criminal' && <Skull size={10} className="text-red-500" />}
                          <div className={`w-1.5 h-1.5 rounded-full ${brain.status === 'ACTIVE' && active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                          <span className={`font-bold text-sm ${brain.id === 'b_singularity' ? 'text-purple-300' : brain.id === 'b_criminal' ? 'text-red-500' : 'text-gray-200'}`}>{brain.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>${brain.balance.toFixed(2)}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded border border-gray-800/50 mb-1 flex gap-2 items-start">
                        <MessageSquare size={10} className="text-gray-500 mt-0.5 shrink-0" />
                        <span className="text-[10px] text-gray-300 font-mono leading-tight animate-in fade-in">{brain.current_thought}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
                       <span>{brain.description}</span>
                       <span>W:{brain.trades_won} L:{brain.trades_lost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: CHART */}
        <div className="col-span-4 flex flex-col gap-1 h-full">
           <div className="flex-1 bg-gray-900 border border-green-900/30 rounded-sm relative p-2 flex flex-col overflow-hidden min-h-0">
            <div className="absolute top-2 left-2 z-10 flex flex-col text-xs font-mono bg-black/50 p-1 rounded backdrop-blur-sm">
              <span className="text-gray-400 font-bold flex items-center gap-2">
                 BTC/USD 
                 {connectionStatus === 'LIVE' ? <Wifi size={10} className="text-green-500"/> : <WifiOff size={10} className="text-red-500"/>}
              </span>
              <span className={`text-xl font-bold ${currentPrice > (priceData[priceData.length-2]?.price || 0) ? "text-green-400" : "text-red-400"}`}>
                ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <ReferenceLine y={currentPrice} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                <Line type="monotone" dataKey="vwap" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: LOGS */}
        <div className="col-span-3 flex flex-col gap-1 h-full">
           <div className="flex-1 min-h-0 bg-gray-900 border border-green-900/30 rounded-sm p-2 overflow-hidden flex flex-col">
             <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2 flex-none"><Zap size={12}/> OPEN POSITIONS</h3>
             <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="pb-1">BRAIN</th>
                      <th className="pb-1">DIR</th>
                      <th className="pb-1">PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSignals.map((sig) => {
                      const pnlRaw = sig.direction === 'LONG' ? currentPrice - sig.entry_price : sig.entry_price - currentPrice;
                      const isPos = pnlRaw > 0;
                      return (
                        <tr key={sig.id} className="border-b border-gray-800/50">
                          <td className={`py-1 ${sig.brain === 'The Criminal' ? 'text-red-500 font-bold' : 'text-gray-300'}`}>{sig.brain.split(' ')[0]}</td>
                          <td className={`py-1 ${sig.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{sig.direction}</td>
                          <td className={`py-1 font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                             {pnlRaw.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
           <div className="flex-1 min-h-0 bg-black border border-gray-800 rounded-sm p-2 flex flex-col font-mono text-[10px]">
               <div className="flex justify-between items-center border-b border-gray-800 pb-1 mb-2 flex-none">
                   <span className="text-green-500 font-bold flex items-center gap-2"><Terminal size={10}/> LOG</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col-reverse" ref={scrollRef}>
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 break-words leading-tight border-b border-gray-900/50 pb-1">
                      <span className="text-gray-600 block text-[9px]">{log.time}</span>
                      <span className={`${log.type === 'trade' ? 'text-blue-400' : log.type === 'dna' ? 'text-purple-400' : log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                        {log.source}: {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
           </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #111; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
}