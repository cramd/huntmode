import { useEffect, useRef } from "react";
import { 
  Shield, Zap, Crosshair, Target, Activity, Cpu, 
  Terminal, Radio, Skull, BatteryCharging, Flame, Orbit
} from "lucide-react";

export interface LogEntry {
  id: string;
  time: string;
  type: "system" | "defense" | "offense" | "danger" | "success";
  text: string;
}

interface ControlPanelProps {
  mode: "defense" | "offense";
  score: number;
  wave: number;
  credits: number;
  baseHealth: number; // For defense, overall city health; for offense, base health remaining
  logs: LogEntry[];
  
  // Defense Mode Specifics
  selectedWeapon?: "flak" | "laser" | "emp";
  setSelectedWeapon?: (weapon: "flak" | "laser" | "emp") => void;
  batteryAmmo?: { flak: number; laser: number; emp: number };
  batteryCooldowns?: { flak: number; laser: number; emp: number }; // 0 to 100
  powerPlantActive?: boolean;
  logisticsActive?: boolean;
  
  // Offense Mode Specifics
  targetPriority?: "defense" | "power" | "logistics" | "command";
  setTargetPriority?: (priority: "defense" | "power" | "logistics" | "command") => void;
  abilitiesCooldowns?: { emp: number; cloak: number; speed: number }; // seconds left, 0 is ready
  triggerAbility?: (ability: "emp" | "cloak" | "speed") => void;
  droneSpawnQueueCount?: { scout: number; decoy: number; kamikaze: number; bomber: number };
  spawnDrone?: (type: "scout" | "decoy" | "kamikaze" | "bomber") => void;
}

export default function ControlPanel({
  mode,
  score,
  wave,
  credits,
  baseHealth,
  logs,
  
  selectedWeapon = "flak",
  setSelectedWeapon,
  batteryAmmo = { flak: 30, laser: 1, emp: 3 },
  batteryCooldowns = { flak: 0, laser: 0, emp: 0 },
  powerPlantActive = true,
  logisticsActive = true,
  
  targetPriority = "defense",
  setTargetPriority,
  abilitiesCooldowns = { emp: 0, cloak: 0, speed: 0 },
  triggerAbility,
  droneSpawnQueueCount = { scout: 0, decoy: 0, kamikaze: 0, bomber: 0 },
  spawnDrone
}: ControlPanelProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="sidebar-panel">
      {/* Top Header - System Mode Info */}
      <div className="glass-panel p-4 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 bg-indigo-500/10 border-l border-b border-indigo-500/20 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
          Node-01
        </div>
        <h2 className="text-sm text-slate-400 uppercase tracking-widest display-font flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
          SYSTEM DIAGNOSTICS
        </h2>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500 uppercase">Current Mission</span>
          <span className={`text-xs font-bold display-font px-2 py-0.5 rounded border ${
            mode === "defense" 
              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
              : "bg-orange-500/10 border-orange-500/20 text-orange-400"
          }`}>
            {mode === "defense" ? "AIR DEFENSE ACTIVE" : "STRIKE FORCE CO-ORD"}
          </span>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <h2 className="text-xs text-slate-400 uppercase tracking-widest display-font flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          TACTICAL READOUT
        </h2>
        
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="stat-box cyan">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tactical Score</span>
            <span className="stat-value text-slate-100 cyan-glow">{score}</span>
          </div>
          
          <div className="stat-box green">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Active Wave</span>
            <span className="stat-value text-slate-100 green-glow">W-0{wave}</span>
          </div>

          <div className="stat-box orange">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {mode === "defense" ? "Tactical Credits" : "Swarm Energy"}
            </span>
            <span className="stat-value text-slate-100 orange-glow">
              {mode === "defense" ? `$${credits}` : `${credits} MW`}
            </span>
          </div>

          <div className={`stat-box ${baseHealth > 50 ? "green" : baseHealth > 25 ? "yellow" : "red"}`}>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {mode === "defense" ? "City Integrity" : "Fortress Integrity"}
            </span>
            <div className="flex flex-col gap-1 mt-1">
              <span className={`stat-value text-slate-100 ${baseHealth > 50 ? "green-glow" : baseHealth > 25 ? "yellow-glow" : "red-glow"}`}>
                {baseHealth}%
              </span>
              <div className="health-bar-container">
                <div 
                  className={`health-bar ${baseHealth > 50 ? "green" : baseHealth > 25 ? "yellow" : "red"}`}
                  style={{ width: `${baseHealth}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode-Specific Panel: Defense Loadouts */}
      {mode === "defense" && (
        <div className="glass-panel p-4 flex flex-col gap-3 flex-shrink-0">
          <h2 className="text-xs text-slate-400 uppercase tracking-widest display-font flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            AIR SHIELD SYSTEMS
          </h2>
          
          <div className="flex flex-col gap-3 mt-1">
            {/* Flak Battery */}
            <button 
              onClick={() => setSelectedWeapon && setSelectedWeapon("flak")}
              className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${
                selectedWeapon === "flak" 
                  ? "bg-cyan-500/10 border-cyan-500/50 text-white" 
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Crosshair className={`w-4 h-4 ${selectedWeapon === "flak" ? "text-cyan-400" : "text-slate-500"}`} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider display-font">Flak Cannon</p>
                  <p className="text-[10px] text-slate-500">Area Splash Blast</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold display-font">{batteryAmmo.flak} RDS</span>
                {batteryCooldowns.flak > 0 && (
                  <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-cyan-500" style={{ width: `${batteryCooldowns.flak}%` }} />
                  </div>
                )}
              </div>
            </button>

            {/* Laser Battery */}
            <button 
              onClick={() => setSelectedWeapon && setSelectedWeapon("laser")}
              className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${
                selectedWeapon === "laser" 
                  ? "bg-cyan-500/10 border-cyan-500/50 text-white" 
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Flame className={`w-4 h-4 ${selectedWeapon === "laser" ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider display-font">Plasma Laser</p>
                  <p className="text-[10px] text-slate-500">Instant Sniper Zap</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold display-font">{batteryAmmo.laser > 0 ? "READY" : "CHARGING"}</span>
                {batteryCooldowns.laser > 0 && (
                  <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-cyan-500 animate-pulse" style={{ width: `${100 - batteryCooldowns.laser}%` }} />
                  </div>
                )}
              </div>
            </button>

            {/* EMP Batter */}
            <button 
              onClick={() => setSelectedWeapon && setSelectedWeapon("emp")}
              className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${
                selectedWeapon === "emp" 
                  ? "bg-cyan-500/10 border-cyan-500/50 text-white" 
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${selectedWeapon === "emp" ? "text-cyan-400" : "text-slate-500"}`} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider display-font">EMP Jammer</p>
                  <p className="text-[10px] text-slate-500">Stun Bubble Blast</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold display-font">{batteryAmmo.emp} EMP</span>
                {batteryCooldowns.emp > 0 && (
                  <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-cyan-500" style={{ width: `${batteryCooldowns.emp}%` }} />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Infrastructure Sub-panel */}
          <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800/80 rounded-lg text-[10px] text-slate-400 mt-1">
            <span className="flex items-center gap-1.5">
              <BatteryCharging className={`w-3.5 h-3.5 ${powerPlantActive ? "text-green-500" : "text-red-500 animate-pulse"}`} />
              GRID: {powerPlantActive ? "ONLINE" : "OFFLINE (COOLDOWN +40%)"}
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className={`w-3.5 h-3.5 ${logisticsActive ? "text-green-500" : "text-red-500 animate-pulse"}`} />
              LOGISTICS: {logisticsActive ? "SECURE" : "CORRUPT (-30% CREDITS)"}
            </span>
          </div>
        </div>
      )}

      {/* Mode-Specific Panel: Offense Swarm Coordination */}
      {mode === "offense" && (
        <div className="glass-panel p-4 flex flex-col gap-4 flex-shrink-0">
          <div>
            <h2 className="text-xs text-slate-400 uppercase tracking-widest display-font flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              SWARM COMMAND PROTOCOLS
            </h2>
            <p className="text-[10px] text-slate-500 mt-1 uppercase">Coordinate swarm target vectors & assembly lines</p>
          </div>

          {/* Target Priority selection */}
          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">1. Swarm Navigation Focus</span>
              <span className="text-[9px] text-orange-500/80 font-bold uppercase animate-pulse">Select target below</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-normal">
              Active drones will trace a direct vector path and steer towards the selected structures.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {[
                { id: "defense", label: "SAM Defenses", icon: Shield, desc: "Disable anti-air SAMs" },
                { id: "power", label: "Power Plants", icon: BatteryCharging, desc: "Slow downSAM rates" },
                { id: "logistics", label: "Logistics Hubs", icon: Cpu, desc: "Decrease base health" },
                { id: "command", label: "Command Center", icon: Skull, desc: "Primary target to win" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTargetPriority && setTargetPriority(p.id as any)}
                  className={`p-2 rounded border text-left flex flex-col gap-0.5 transition-all ${
                    targetPriority === p.id 
                      ? "bg-orange-500/15 border-orange-500 text-white font-semibold shadow-[0_0_10px_rgba(249,115,22,0.1)]" 
                      : "bg-slate-900/40 border-slate-850 text-slate-450 hover:border-slate-700"
                  }`}
                  title={p.desc}
                >
                  <span className="text-[10px] font-bold flex items-center gap-1.5">
                    <p.icon className={`w-3.5 h-3.5 ${targetPriority === p.id ? "text-orange-400" : "text-slate-500"}`} />
                    {p.label}
                  </span>
                  <span className="text-[8px] text-slate-500 leading-none">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drone Spawning Controls */}
          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">2. Deploy Drone Squadron</span>
              <span className="text-[9px] text-slate-500">Launch from carrier</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-normal">
              Click buttons to deploy. Drones spawn at random coordinates in the upper atmosphere.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => spawnDrone && spawnDrone("scout")}
                className="p-2 rounded border border-slate-850 hover:border-orange-500/50 bg-slate-900/60 hover:bg-orange-500/5 text-left text-xs transition-all relative"
              >
                <div className="flex justify-between font-bold display-font">
                  <span>SCOUT</span>
                  <span className="text-orange-400">10 MW</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Fast, basic scout</div>
                <span className="absolute bottom-1 right-2 text-[9px] text-orange-500/70 font-bold bg-orange-500/10 px-1 rounded">
                  Affordable: {droneSpawnQueueCount.scout}
                </span>
              </button>
              <button
                onClick={() => spawnDrone && spawnDrone("decoy")}
                className="p-2 rounded border border-slate-850 hover:border-orange-500/50 bg-slate-900/60 hover:bg-orange-500/5 text-left text-xs transition-all relative"
              >
                <div className="flex justify-between font-bold display-font">
                  <span>DECOY</span>
                  <span className="text-orange-400">20 MW</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Heavy HP, Shielded</div>
                <span className="absolute bottom-1 right-2 text-[9px] text-orange-500/70 font-bold bg-orange-500/10 px-1 rounded">
                  Affordable: {droneSpawnQueueCount.decoy}
                </span>
              </button>
              <button
                onClick={() => spawnDrone && spawnDrone("kamikaze")}
                className="p-2 rounded border border-slate-850 hover:border-orange-500/50 bg-slate-900/60 hover:bg-orange-500/5 text-left text-xs transition-all relative"
              >
                <div className="flex justify-between font-bold display-font">
                  <span>KAMIKAZE</span>
                  <span className="text-orange-400">30 MW</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Self-destructs (80 DMG)</div>
                <span className="absolute bottom-1 right-2 text-[9px] text-orange-500/70 font-bold bg-orange-500/10 px-1 rounded">
                  Affordable: {droneSpawnQueueCount.kamikaze}
                </span>
              </button>
              <button
                onClick={() => spawnDrone && spawnDrone("bomber")}
                className="p-2 rounded border border-slate-850 hover:border-orange-500/50 bg-slate-900/60 hover:bg-orange-500/5 text-left text-xs transition-all relative"
              >
                <div className="flex justify-between font-bold display-font">
                  <span>BOMBER</span>
                  <span className="text-orange-400">50 MW</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Drops Bombs periodically</div>
                <span className="absolute bottom-1 right-2 text-[9px] text-orange-500/70 font-bold bg-orange-500/10 px-1 rounded">
                  Affordable: {droneSpawnQueueCount.bomber}
                </span>
              </button>
            </div>
          </div>

          {/* Commander Tactics */}
          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">3. Swarm Commander Tactics</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                disabled={abilitiesCooldowns.emp > 0}
                onClick={() => triggerAbility && triggerAbility("emp")}
                className={`p-2 rounded border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  abilitiesCooldowns.emp > 0 
                    ? "bg-slate-900/20 border-slate-900 text-slate-600 cursor-not-allowed" 
                    : "bg-slate-900/60 border-orange-500/30 text-slate-300 hover:border-orange-500 hover:text-white"
                }`}
                title="Disable enemy SAM defense batteries for 4 seconds"
              >
                <Orbit className="w-4.5 h-4.5" />
                <span className="text-[9px] uppercase font-bold display-font">EMP SWEEP</span>
                {abilitiesCooldowns.emp > 0 && <span className="text-[8px] text-orange-500">{abilitiesCooldowns.emp}s</span>}
              </button>
              <button
                disabled={abilitiesCooldowns.cloak > 0}
                onClick={() => triggerAbility && triggerAbility("cloak")}
                className={`p-2 rounded border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  abilitiesCooldowns.cloak > 0 
                    ? "bg-slate-900/20 border-slate-900 text-slate-600 cursor-not-allowed" 
                    : "bg-slate-900/60 border-orange-500/30 text-slate-300 hover:border-orange-500 hover:text-white"
                }`}
                title="Make all spawned drones invisible to lock-on for 3 seconds"
              >
                <Radio className="w-4.5 h-4.5" />
                <span className="text-[9px] uppercase font-bold display-font">CLOAK SWARM</span>
                {abilitiesCooldowns.cloak > 0 && <span className="text-[8px] text-orange-500">{abilitiesCooldowns.cloak}s</span>}
              </button>
              <button
                disabled={abilitiesCooldowns.speed > 0}
                onClick={() => triggerAbility && triggerAbility("speed")}
                className={`p-2 rounded border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  abilitiesCooldowns.speed > 0 
                    ? "bg-slate-900/20 border-slate-900 text-slate-600 cursor-not-allowed" 
                    : "bg-slate-900/60 border-orange-500/30 text-slate-300 hover:border-orange-500 hover:text-white"
                }`}
                title="Boost drone engine speeds by 60% for 4 seconds"
              >
                <Zap className="w-4.5 h-4.5" />
                <span className="text-[9px] uppercase font-bold display-font">BOOST SPEED</span>
                {abilitiesCooldowns.speed > 0 && <span className="text-[8px] text-orange-500">{abilitiesCooldowns.speed}s</span>}
              </button>
            </div>
          </div>

          {/* Tactical Combo Synergy Tip */}
          <div className="p-2.5 rounded bg-orange-500/5 border border-orange-500/10 text-[9px] text-orange-400/90 leading-relaxed text-left">
            <strong>💡 Swarm Directive:</strong> Deploy <strong>Decoys</strong> first to draw SAM radar locks, then send <strong>Kamikazes</strong> targeting <strong>SAM Defenses</strong> to secure airspace.
          </div>
        </div>
      )}

      {/* Interactive Combat Logs */}
      <div className="glass-panel p-4 flex flex-col gap-2 flex-1 min-h-[160px] max-h-[300px]">
        <h2 className="text-xs text-slate-400 uppercase tracking-widest display-font flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          TACTICAL LOG STREAM
        </h2>
        <div ref={logContainerRef} className="terminal-log">
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-4 italic">No tactical data received.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="terminal-line">
                <span className="terminal-time">[{log.time}]</span>
                <span className={`terminal-msg ${log.type}`}>{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
