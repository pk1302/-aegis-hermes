import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, Zap, Brain, Terminal, Play, Pause, RefreshCw, Dna, Wifi, WifiOff, 
  MessageSquare, Radio, Loader2, CheckCircle2, User as UserIcon, Skull, 
  TrendingUp, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, YAxis, ResponsiveContainer, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Tooltip, BarChart, Bar, Cell
} from 'recharts';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

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

// Default fallback state
const DEFAULT_BRAINS = [
  { id: 'b_rotter', name: 'Paul Rotter', balance: 100, trades_won: 0, trades_lost: 0, current_thought: 'Waiting for Bot...', color: '#10b981' },
  { id: 'b_criminal', name: 'The Criminal', balance: 100, trades_won: 0, trades_lost: 0, current_thought: 'Waiting for Bot...', color: '#e11d48' },
  { id: 'b_singularity', name: 'The Singularity', balance: 100, trades_won: 0, trades_lost: 0, current_thought: 'Waiting for Bot...', color: '#ffffff' }
];

export default function App() {
  const [brains, setBrains] = useState<any[]>(DEFAULT_BRAINS);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const wsRef = useRef<WebSocket | null>(null);

  // --- 1. AUTH & DB SYNC ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);

    // Listen to the EXACT path the Bot uses
    const docRef = doc(db, 'artifacts', APP_NAMESPACE, 'public', 'data', 'live', 'swarm_state_v9');
    
    const unsub = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.brains) {
          setBrains(data.brains);
          addLog('DATABASE', 'Received Swarm Update', 'success');
        }
      } else {
        addLog('DATABASE', 'Waiting for Bot to create data...', 'warn');
      }
    }, (err) => addLog('DATABASE', err.message, 'error'));

    return () => unsub();
  }, []);

  // --- 2. WEBSOCKET (For Price Chart Only) ---
  useEffect(() => {
    const connectWS = () => {
        const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        wsRef.current = ws;
        ws.onopen = () => {
            setConnectionStatus('LIVE');
            ws.send(JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] }));
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'ticker' && data.price) {
                const price = parseFloat(data.price);
                setCurrentPrice(price);
                setPriceData(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), price }]);
            }
        };
        ws.onclose = () => setTimeout(connectWS, 2000);
    };
    connectWS();
    return () => { if(wsRef.current) wsRef.current.close(); };
  }, []);

  const addLog = (source: string, msg: string, type: string) => {
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), source, msg, type }, ...prev.slice(0, 49)]);
  };

  // --- RENDER (Simplified) ---
  return (
    <div className="flex flex-col h-screen bg-black text-gray-300 font-mono p-2">
      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
         <h1 className="text-xl font-bold text-white flex gap-2"><Brain className="text-purple-500"/> AEGIS DASHBOARD</h1>
         <div className="text-xs">{connectionStatus} | BTC: ${currentPrice.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-12 gap-2 flex-1 overflow-hidden">
         {/* LEFT: BRAINS */}
         <div className="col-span-3 overflow-y-auto custom-scrollbar border border-gray-800 rounded p-2">
            {brains.map(b => (
                <div key={b.id || Math.random()} className="mb-2 p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="flex justify-between text-xs font-bold text-white">
                        <span>{b.name}</span>
                        <span className={b.balance > 100 ? 'text-green-400' : 'text-red-400'}>${b.balance?.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{b.current_thought}</div>
                </div>
            ))}
         </div>

         {/* CENTER: CHART */}
         <div className="col-span-6 border border-gray-800 rounded bg-gray-900/20 relative">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData}>
                   <YAxis domain={['auto', 'auto']} hide />
                   <Area type="monotone" dataKey="price" stroke="#8b5cf6" fillOpacity={0.1} />
                </AreaChart>
             </ResponsiveContainer>
         </div>

         {/* RIGHT: LOGS */}
         <div className="col-span-3 border border-gray-800 rounded p-2 text-[10px] overflow-y-auto custom-scrollbar flex flex-col-reverse">
             {logs.map((l, i) => (
                 <div key={i} className="mb-1 text-gray-500"><span className="text-gray-700">[{l.time}]</span> {l.msg}</div>
             ))}
         </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; background: #000; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }`}</style>
    </div>
  );
}
