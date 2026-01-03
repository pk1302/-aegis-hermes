import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, Zap, Brain, Terminal, Play, Pause, Server, RefreshCw, Dna, Wifi, WifiOff, 
  MessageSquare, Radio, Loader2, CheckCircle2, User as UserIcon, Skull, 
  LayoutDashboard, PieChart, TrendingUp, AlertOctagon, Sword, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Line, LineChart,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, BarChart, Bar, Cell
} from 'recharts';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const INITIAL_CAPITAL = 100;
const APP_NAMESPACE = 'aegis-core-v1'; 

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAwwFWF0FScFWKTvteUDgVQFJ3dbh8VxGY",
  authDomain: "aegis-hermes.firebaseapp.com",
  projectId: "aegis-hermes",
  storageBucket: "aegis-hermes.firebasestorage.app",
  messagingSenderId: "623564992158",
  appId: "1:623564992158:web:3636d7c063b27c4f50d58f",
  measurementId: "G-2F6FGJMQ85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DEFAULT_BRAINS = [
  { id: 'b_rotter', name: 'Paul Rotter', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Calibrating L2 feed...', description: 'HFT/Order Book', color: '#10b981', strategy_bias: 'hft', base_aggression: 0.9, adaptive_mod: 0, confidence_threshold: 0.85, learning_generation: 0 },
  { id: 'b_volman', name: 'Bob Volman', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Measuring tick volatility...', description: 'Fractal Price Action', color: '#3b82f6', strategy_bias: 'scalp', base_aggression: 0.6, adaptive_mod: 0, confidence_threshold: 0.80, learning_generation: 0 },
  { id: 'b_brooks', name: 'Al Brooks', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Waiting for bar close...', description: 'Probabilistic', color: '#f59e0b', strategy_bias: 'swing', base_aggression: 0.4, adaptive_mod: 0, confidence_threshold: 0.75, learning_generation: 0 },
  { id: 'b_diamond', name: 'Matt Diamond', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Calculating VWAP deviation...', description: 'Volume/Zones', color: '#8b5cf6', strategy_bias: 'scalp', base_aggression: 0.5, adaptive_mod: 0, confidence_threshold: 0.82, learning_generation: 0 },
  { id: 'b_hougaard', name: 'Tom Hougaard', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Checking momentum slope...', description: 'Momentum', color: '#ec4899', strategy_bias: 'swing', base_aggression: 0.8, adaptive_mod: 0, confidence_threshold: 0.88, learning_generation: 0 },
  { id: 'b_medhat', name: 'Momen Medhat', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Scanning regime state...', description: 'Adaptive', color: '#06b6d4', strategy_bias: 'scalp', base_aggression: 0.5, adaptive_mod: 0, confidence_threshold: 0.80, learning_generation: 0 },
  { id: 'b_criminal', name: 'The Criminal', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Init...', current_thought: 'Scanning for liquidity voids...', description: 'Stop Hunter/Exploit', color: '#e11d48', strategy_bias: 'criminal', base_aggression: 0.95, adaptive_mod: 0, confidence_threshold: 0.58, learning_generation: 0 },
  { id: 'b_singularity', name: 'The Singularity', status: 'ACTIVE', balance: INITIAL_CAPITAL, trades_won: 0, trades_lost: 0, lastSignal: 'Synthesizing...', current_thought: 'Analyzing swarm intelligence...', description: 'Meta-Evolutionary', color: '#ffffff', strategy_bias: 'meta', base_aggression: 0.1, adaptive_mod: 0, confidence_threshold: 0.70, learning_generation: 1, dna_weights: { 'b_rotter': 0.14, 'b_volman': 0.14, 'b_brooks': 0.14, 'b_diamond': 0.14, 'b_hougaard': 0.14, 'b_medhat': 0.14, 'b_criminal': 0.16 } },
];

export default function App() {
  const [active, setActive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'ERROR'>('CONNECTING');
  const [dataLoaded, setDataLoaded] = useState(false); 
  const [activeTab, setActiveTab] = useState<'CHART' | 'PERFORMANCE' | 'DNA'>('CHART');
  const [priceData, setPriceData] = useState<{time: string, price: number, vwap: number}[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [brains, setBrains] = useState(DEFAULT_BRAINS);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSignals, setActiveSignals] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- STATS ---
  const globalStats = useMemo(() => {
    const totalEquity = brains.reduce((acc, b) => acc + b.balance, 0);
    const totalStart = brains.length * INITIAL_CAPITAL;
    const netPnL = totalEquity - totalStart;
    const totalWins = brains.reduce((acc, b) => acc + b.trades_won, 0);
    const totalLosses = brains.reduce((acc, b) => acc + b.trades_lost, 0);
    const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
    
    const perfData = brains.map(b => ({
      name: b.name.split(' ')[1] || b.name,
      profit: b.balance - INITIAL_CAPITAL,
      color: b.color
    })).sort((a,b) => b.profit - a.profit);

    const singularity = brains.find(b => b.id === 'b_singularity');
    const dnaData = singularity?.dna_weights ? Object.entries(singularity.dna_weights).map(([k, v]) => ({
      subject: k.replace('b_', '').toUpperCase(),
      A: v * 100,
      fullMark: 100
    })) : [];

    return { totalEquity, netPnL, winRate, totalWins, totalLosses, perfData, dnaData };
  }, [brains]);

  // --- LOGGING ---
  const addLog = (source: string, msg: any, type: string = 'info') => {
    const safeMsg = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), source, msg: safeMsg, type }, ...prev.slice(0, 49)]);
  };

  // --- AUTH ---
  useEffect(() => {
    const initAuth = async () => { await signInAnonymously(auth); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
    return () => unsubscribe();
  }, []);

  // --- DATABASE SYNC (PUBLIC CHANNEL) ---
  useEffect(() => {
    if (!db) return;
    const docRef = doc(db, 'artifacts', APP_NAMESPACE, 'public', 'data', 'live', 'swarm_state_v9');
    
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data().brains) {
        setBrains(prev => DEFAULT_BRAINS.map(def => {
          const saved = snap.data().brains.find((b: any) => b.id === def.id);
          return saved ? { ...def, ...saved } : def;
        }));
        setDataLoaded(true);
        if (!active) addLog('DATABASE', 'Sync: Received Update.', 'success');
      } else {
        if (!dataLoaded) addLog('DATABASE', 'Waiting for Bot Signal...', 'warn');
      }
    }, (error) => {
        addLog('DATABASE', `Error: ${error.message}`, 'error');
    });
    return () => unsub();
  }, [active]);

  // --- WEBSOCKET (Only runs if active OR if user manually connects) ---
  useEffect(() => {
    if (!active || !dataLoaded) {
       if (wsRef.current) wsRef.current.close();
       setConnectionStatus('CONNECTING');
       return;
    }
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
                const newData = [...prev, { time: new Date().toLocaleTimeString(), price: price, vwap: (lastVwap * 0.99) + (price * 0.01) }];
                return newData.slice(-50);
            });
        }
    };
    
    ws.onerror = () => setConnectionStatus('ERROR');
    return () => { ws.close(); };
  }, [active, dataLoaded]);

  const sortedBrains = [...brains].sort((a, b) => b.balance - a.balance);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-300 font-mono overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Brain className="text-purple-500" size={20} /> AEGIS HERMES <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">V9.2 LIVE</span>
          </h1>
          <div className="flex gap-6 text-xs">
             <div><span className="text-gray-500 block text-[10px]">SWARM EQUITY</span><span className="text-white font-bold text-lg">${globalStats.totalEquity.toFixed(2)}</span></div>
             <div><span className="text-gray-500 block text-[10px]">NET PNL</span><span className={`font-bold text-lg ${globalStats.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{globalStats.netPnL.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 text-[10px] text-gray-500 border-r border-gray-800 pr-3"><Globe size={10} /> BROADCAST MODE</div>
           <div className={`px-3 py-1 rounded text-[10px] border ${connectionStatus === 'LIVE' ? 'border-green-900 text-green-400' : 'border-red-900 text-red-400'}`}>{connectionStatus}</div>
           <button onClick={() => setActive(!active)} disabled={!dataLoaded} className={`px-4 py-1.5 rounded text-sm font-bold border ${active ? 'border-red-900 text-red-400' : 'border-green-900 text-green-400'}`}>{active ? 'HALT' : 'ENGAGE'}</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-1 p-2 overflow-hidden">
        <div className="col-span-3 flex flex-col gap-1 overflow-hidden h-full">
           <div className="bg-gray-900/50 border border-gray-800 p-2 rounded-t text-xs font-bold text-gray-400">NEURAL SWARM</div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {sortedBrains.map((brain) => (
                 <div key={brain.id} className="p-2 rounded border border-gray-800 bg-gray-900/40">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                          {brain.id === 'b_criminal' ? <Skull size={12} className="text-red-500"/> : brain.id === 'b_singularity' ? <Dna size={12} className="text-purple-500"/> : <Brain size={12} className="text-gray-500"/>}
                          <span className={`text-xs font-bold ${brain.id === 'b_criminal' ? 'text-red-400' : brain.id === 'b_singularity' ? 'text-purple-300' : 'text-gray-300'}`}>{brain.name}</span>
                       </div>
                       <span className={`text-xs font-bold ${brain.balance >= INITIAL_CAPITAL ? 'text-green-400' : 'text-red-400'}`}>${brain.balance.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{brain.current_thought}</div>
                 </div>
              ))}
           </div>
        </div>

        <div className="col-span-6 flex flex-col gap-1 h-full">
           <div className="flex gap-1 mb-1">
              <button onClick={() => setActiveTab('CHART')} className={`flex-1 py-1 text-xs border rounded ${activeTab==='CHART' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>PRICE</button>
              <button onClick={() => setActiveTab('DNA')} className={`flex-1 py-1 text-xs border rounded ${activeTab==='DNA' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>DNA</button>
           </div>
           <div className="flex-1 bg-gray-900/30 border border-gray-800 rounded relative overflow-hidden">
              {activeTab === 'CHART' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Area type="monotone" dataKey="price" stroke="#10b981" fillOpacity={0.1} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={globalStats.dnaData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10 }} />
                      <Radar name="Weights" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                   </RadarChart>
                </ResponsiveContainer>
              )}
           </div>
        </div>

        <div className="col-span-3 flex flex-col gap-1 h-full">
           <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded p-2 text-[10px] overflow-y-auto custom-scrollbar">
              <div className="font-bold text-gray-500 mb-2">SYSTEM LOG</div>
              {logs.map((log, i) => (
                <div key={i} className="mb-1"><span className="text-gray-600">[{log.time}]</span> <span className={log.type === 'error' ? 'text-red-400' : 'text-gray-400'}>{log.source}: {log.msg}</span></div>
              ))}
           </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }`}</style>
    </div>
  );
}
