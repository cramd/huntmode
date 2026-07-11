import { useState, useEffect } from "react";
import GameCanvas from "./components/GameCanvas";
import ControlPanel from "./components/ControlPanel";
import type { LogEntry } from "./components/ControlPanel";
import UpgradeShop from "./components/UpgradeShop";
import type { UpgradeState } from "./components/UpgradeShop";
import { 
  Gamepad2, Volume2, VolumeX, Shield, Target, Play, RotateCcw, Award, BookOpen, AlertCircle
} from "lucide-react";

type GamePhase = "MENU" | "PLAYING" | "UPGRADE" | "GAMEOVER";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("MENU");
  const [mode, setMode] = useState<"defense" | "offense">("defense");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [credits, setCredits] = useState(0); // Defense credits OR Offense energy MW
  const [savedCredits, setSavedCredits] = useState(0); // Persistent credits across waves for upgrades
  const [baseHealth, setBaseHealth] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Game Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // High Scores State
  const [highScores, setHighScores] = useState({ defense: 0, offense: 0 });

  // Defense Mode State
  const [selectedWeapon, setSelectedWeapon] = useState<"flak" | "laser" | "emp">("flak");
  const [batteryAmmo, setBatteryAmmo] = useState({ flak: 35, laser: 1, emp: 3 });
  const [batteryCooldowns, setBatteryCooldowns] = useState({ flak: 0, laser: 0, emp: 0 });
  const [powerPlantActive, setPowerPlantActive] = useState(true);
  const [logisticsActive, setLogisticsActive] = useState(true);

  // Offense Mode State
  const [targetPriority, setTargetPriority] = useState<"defense" | "power" | "logistics" | "command">("defense");
  const [droneSpawnTrigger, setDroneSpawnTrigger] = useState<"scout" | "decoy" | "kamikaze" | "bomber" | null>(null);
  const [abilityTrigger, setAbilityTrigger] = useState<"emp" | "cloak" | "speed" | null>(null);
  const [abilitiesCooldowns, setAbilitiesCooldowns] = useState({ emp: 0, cloak: 0, speed: 0 });

  // Upgrades state
  const [upgrades, setUpgrades] = useState<UpgradeState>({
    flakMaxAmmoLevel: 0,
    laserRechargeLevel: 0,
    empRadiusLevel: 0,
    cityArmorLevel: 0,
    maxEnergyLevel: 0,
    energyRegenLevel: 0,
    abilityCooldownLevel: 0,
    droneHpLevel: 0
  });

  // Load High Scores on mount
  useEffect(() => {
    const saved = localStorage.getItem("dronecommando:highscores");
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const addLog = (text: string, type: "system" | "defense" | "offense" | "danger" | "success") => {
    const time = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
    
    setLogs(prev => {
      const next = [...prev, { id: Math.random().toString(), time: timestamp, type, text }];
      // Keep logs at max 40 entries
      if (next.length > 40) next.shift();
      return next;
    });
  };

  // Spawn Drone Cost Calculation (for Offense mode)
  const droneSpawnCost = (type: "scout" | "decoy" | "kamikaze" | "bomber") => {
    switch (type) {
      case "scout": return 10;
      case "decoy": return 20;
      case "kamikaze": return 30;
      case "bomber": return 50;
      default: return 10;
    }
  };

  // Keyboard controls listener (1, 2, 3 selection keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "PLAYING") return;
      
      if (mode === "defense") {
        if (e.key === "1") {
          setSelectedWeapon("flak");
          addLog("Armed battery: Flak Cannon", "system");
        } else if (e.key === "2") {
          setSelectedWeapon("laser");
          addLog("Armed battery: Plasma Laser", "system");
        } else if (e.key === "3") {
          setSelectedWeapon("emp");
          addLog("Armed battery: EMP Jammer", "system");
        }
      }
      
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, mode]);

  // Real-time ticking for energy regeneration and ability cooldowns in Offense Mode
  useEffect(() => {
    if (phase !== "PLAYING" || isPaused) return;

    const timer = setInterval(() => {
      // 1. Cooldowns ticking down
      setAbilitiesCooldowns(prev => ({
        emp: Math.max(0, prev.emp - 1),
        cloak: Math.max(0, prev.cloak - 1),
        speed: Math.max(0, prev.speed - 1)
      }));

      // 2. Offense mode energy regeneration
      if (mode === "offense") {
        const maxEnergy = 200 + upgrades.maxEnergyLevel * 50;
        const regenRate = 10 + upgrades.energyRegenLevel * 2.5; // MW per second
        setCredits(prev => Math.min(maxEnergy, prev + Math.round(regenRate * 0.1)));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, isPaused, mode, upgrades.maxEnergyLevel, upgrades.energyRegenLevel]);

  // Start the Game
  const startGame = (selectedMode: "defense" | "offense") => {
    setMode(selectedMode);
    setScore(0);
    setWave(1);
    setBaseHealth(100);
    setLogs([]);
    setUpgrades({
      flakMaxAmmoLevel: 0,
      laserRechargeLevel: 0,
      empRadiusLevel: 0,
      cityArmorLevel: 0,
      maxEnergyLevel: 0,
      energyRegenLevel: 0,
      abilityCooldownLevel: 0,
      droneHpLevel: 0
    });

    if (selectedMode === "defense") {
      setCredits(0);
      setSavedCredits(0);
      setBatteryAmmo({
        flak: 35, // starting flak ammo
        laser: 1,
        emp: 3
      });
      addLog("Air Defense networks synchronized.", "system");
    } else {
      // Offense starting energy (MW)
      setCredits(200);
      setSavedCredits(200); // represents strike budget
      addLog("Swarm carriers established in upper atmosphere.", "system");
    }

    setPhase("PLAYING");
    setIsPaused(false);
  };

  // Play weapon fire beep
  const playBeep = (freq: number, type: OscillatorType, dur: number) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {
      console.warn("AudioContext block", e);
    }
  };

  const handleWeaponFiredSound = (weapon: "flak" | "laser" | "emp") => {
    if (weapon === "flak") {
      playBeep(180, "sawtooth", 0.15);
    } else if (weapon === "laser") {
      playBeep(880, "sine", 0.25);
    } else if (weapon === "emp") {
      playBeep(260, "triangle", 0.4);
    }
  };

  // Handle Offense Ability Spawning / Cooldown setting
  const triggerOffenseAbility = (ability: "emp" | "cloak" | "speed") => {
    // Check ability triggers
    if (abilitiesCooldowns[ability] > 0) return;

    // Trigger visual in canvas
    setAbilityTrigger(ability);

    // Apply custom ability cooldowns (level reduces it)
    const baseCooldown = ability === "emp" ? 15 : ability === "cloak" ? 20 : 15;
    const cooldownFactor = Math.pow(0.85, upgrades.abilityCooldownLevel);
    const finalCooldown = Math.round(baseCooldown * cooldownFactor);

    setAbilitiesCooldowns(prev => ({
      ...prev,
      [ability]: finalCooldown
    }));

    playBeep(ability === "emp" ? 100 : ability === "cloak" ? 440 : 600, "triangle", 0.3);
  };

  // Triggered when Wave is successfully completed
  const handleWaveComplete = (earnedCredits: number) => {
    setWave(prev => prev + 1);
    
    if (mode === "defense") {
      setSavedCredits(prev => prev + earnedCredits);
      addLog(`Wave ${wave} secured! Earned +$${earnedCredits} bounty credits`, "success");
    } else {
      // Offense mode
      setSavedCredits(prev => prev + earnedCredits);
      addLog(`Fortress sector compromised! Swarm payload awarded +${earnedCredits} MW`, "success");
    }

    setPhase("UPGRADE");
  };

  // Handle Upgrade Purchases
  const handlePurchaseUpgrade = (upgradeId: string, cost: number) => {
    if (savedCredits < cost) return;

    setSavedCredits(prev => prev - cost);
    setUpgrades(prev => ({
      ...prev,
      [upgradeId]: prev[upgradeId as keyof UpgradeState] + 1
    }));

    playBeep(520, "sine", 0.1);
    addLog(`System Upgrade purchased: ${upgradeId.replace("Level", "").toUpperCase()}`, "success");
  };

  const handleRepairBase = (cost: number) => {
    if (savedCredits < cost) return;

    setSavedCredits(prev => prev - cost);
    // Restoration of structures done inside GameCanvas reset but we can boost baseHealth
    setBaseHealth(prev => Math.min(100, prev + 25));
    addLog("Nanite regenerators deployed - Base integrity reinforced (+25%)", "success");
    playBeep(440, "sine", 0.15);
  };

  // Next Wave Setup after upgrade shop exits
  const handleNextWave = () => {
    // Reset tactical metrics
    if (mode === "defense") {
      setCredits(savedCredits);
      // Replenish ammo to maximum (incorporate ammo upgrade lvl)
      const maxFlak = 35 + upgrades.flakMaxAmmoLevel * 15;
      const maxEmp = 3 + upgrades.empRadiusLevel;
      setBatteryAmmo({
        flak: maxFlak,
        laser: 1,
        emp: maxEmp
      });
      setBatteryCooldowns({ flak: 0, laser: 0, emp: 0 });
    } else {
      // Offense mode starting energy
      const maxEnergy = 200 + upgrades.maxEnergyLevel * 50;
      setCredits(maxEnergy);
    }
    
    setPhase("PLAYING");
    setIsPaused(false);
  };

  // Triggered when Game is lost / finished
  const handleGameOver = (finalScore: number) => {
    setPhase("GAMEOVER");
    
    // Save High Score
    const updatedScores = { ...highScores };
    if (mode === "defense" && finalScore > highScores.defense) {
      updatedScores.defense = finalScore;
    } else if (mode === "offense" && finalScore > highScores.offense) {
      updatedScores.offense = finalScore;
    }
    setHighScores(updatedScores);
    localStorage.setItem("dronecommando:highscores", JSON.stringify(updatedScores));

    playBeep(120, "sawtooth", 0.8);
  };

  return (
    <div className="w-full h-full relative crt-flicker scanline">
      {/* CRT Overlay visual effect */}
      <div className="crt-overlay" />

      {/* 1. Main Menu View */}
      {phase === "MENU" && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden">
          <div className="cyber-grid" />
          
          <div className="glass-panel w-full max-w-2xl p-8 flex flex-col gap-6 items-center text-center relative z-10">
            {/* Game Title */}
            <div>
              <span className="text-[11px] text-cyan-400 font-bold tracking-[0.25em] display-font uppercase">Tactical Swarm Simulation</span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-100 display-font mt-2 tracking-wide uppercase leading-none">
                Drone <span className="text-cyan-400 cyan-glow">Commando</span>
              </h1>
              <div className="h-0.5 w-32 bg-indigo-500/30 mx-auto mt-4" />
            </div>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Control the grid. Command autonomous air-defenses to vaporize swarms, or lead a drone swarm targeting energy centers and air batteries.
            </p>

            <button 
              onClick={() => setShowInstructions(true)}
              className="cyber-button text-xs py-2 px-4 flex items-center gap-1.5 border-indigo-500/30 bg-slate-900/60 hover:border-indigo-500 hover:text-white"
            >
              <BookOpen className="w-4 h-4" /> READ SIMULATION MANUAL
            </button>

            {/* High Scores Display */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm my-2">
              <div className="glass-panel p-3 flex flex-col items-center border-cyan-500/10">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Shield High Score</span>
                <span className="text-lg font-bold display-font text-cyan-400 cyan-glow mt-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> {highScores.defense}
                </span>
              </div>
              <div className="glass-panel p-3 flex flex-col items-center border-orange-500/10">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Swarm High Score</span>
                <span className="text-lg font-bold display-font text-orange-400 orange-glow mt-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> {highScores.offense}
                </span>
              </div>
            </div>

            {/* Selection modes */}
            <div className="flex flex-col md:flex-row gap-4 w-full mt-2">
              {/* Defense Selection Card */}
              <button 
                onClick={() => startGame("defense")}
                className="flex-1 glass-panel p-6 bg-slate-900/40 hover:bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/50 flex flex-col items-center gap-3 transition-all group"
              >
                <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200 display-font uppercase tracking-wider">Shield Commander</h3>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Fire flak shells, track and vaporize heavy bombers with plasma lasers, and release electromagnetic pulses to protect base cities.
                </p>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest display-font mt-2 flex items-center gap-1">
                  PLAY DEFENSE <Play className="w-3.5 h-3.5 fill-cyan-400" />
                </span>
              </button>

              {/* Offense Selection Card */}
              <button 
                onClick={() => startGame("offense")}
                className="flex-1 glass-panel p-6 bg-slate-900/40 hover:bg-orange-500/5 border-orange-500/10 hover:border-orange-500/50 flex flex-col items-center gap-3 transition-all group"
              >
                <div className="p-4 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200 display-font uppercase tracking-wider">Swarm Commander</h3>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Deploy fast scouts, bubble-shielded decoy drones, and kamikazes. Set target priority lists to decimate fortress anti-air grids.
                </p>
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest display-font mt-2 flex items-center gap-1">
                  PLAY OFFENSE <Play className="w-3.5 h-3.5 fill-orange-400" />
                </span>
              </button>
            </div>

            {/* Instruction Footer */}
            <div className="flex justify-between items-center w-full border-t border-slate-800 pt-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> ESC key to pause simulation</span>
              <button 
                onClick={() => setSoundEnabled(prev => !prev)}
                className="hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Sound: {soundEnabled ? "On" : "Off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Playing Arena View */}
      {phase === "PLAYING" && (
        <div className="game-container">
          <div className="game-main">
            {/* Topbar HUD */}
            <div className="glass-panel px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Gamepad2 className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold display-font text-slate-100 uppercase tracking-wider leading-none">Drone Commando</h3>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Simulation Live</span>
                </div>
              </div>

              {/* Game indicators */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">MODE</span>
                  <p className={`text-xs font-bold display-font ${mode === "defense" ? "text-cyan-400" : "text-orange-400"}`}>
                    {mode === "defense" ? "SHIELD SYSTEM" : "SWARM COMMAND"}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <button 
                  onClick={() => setIsPaused(prev => !prev)}
                  className="cyber-button py-1.5 px-3 text-[10px]"
                >
                  {isPaused ? "RESUME" : "PAUSE"}
                </button>
              </div>
            </div>

            {/* Main Interactive Canvas */}
            <GameCanvas
              mode={mode}
              wave={wave}
              upgrades={upgrades}
              
              selectedWeapon={selectedWeapon}
              onWeaponFired={handleWeaponFiredSound}
              batteryAmmo={batteryAmmo}
              batteryCooldowns={batteryCooldowns}
              setBatteryCooldowns={setBatteryCooldowns}
              setBatteryAmmo={setBatteryAmmo}
              powerPlantActive={powerPlantActive}
              setPowerPlantActive={setPowerPlantActive}
              logisticsActive={logisticsActive}
              setLogisticsActive={setLogisticsActive}

              targetPriority={targetPriority}
              droneSpawnTrigger={droneSpawnTrigger}
              onDroneSpawned={() => setDroneSpawnTrigger(null)}
              abilityTrigger={abilityTrigger}
              onAbilityTriggered={() => setAbilityTrigger(null)}
              droneSpawnCost={droneSpawnCost}
              credits={credits}
              setCredits={setCredits}

              addLog={addLog}
              onGameOver={handleGameOver}
              onWaveComplete={handleWaveComplete}
              score={score}
              setScore={setScore}
              baseHealth={baseHealth}
              setBaseHealth={setBaseHealth}
              isPaused={isPaused}
            />
          </div>

          {/* Right HUD Control Panel */}
          <ControlPanel
            mode={mode}
            score={score}
            wave={wave}
            credits={credits}
            baseHealth={baseHealth}
            logs={logs}

            selectedWeapon={selectedWeapon}
            setSelectedWeapon={setSelectedWeapon}
            batteryAmmo={batteryAmmo}
            batteryCooldowns={batteryCooldowns}
            powerPlantActive={powerPlantActive}
            logisticsActive={logisticsActive}

            targetPriority={targetPriority}
            setTargetPriority={setTargetPriority}
            abilitiesCooldowns={abilitiesCooldowns}
            triggerAbility={triggerOffenseAbility}
            droneSpawnQueueCount={{
              scout: credits >= 10 ? Math.floor(credits / 10) : 0,
              decoy: credits >= 20 ? Math.floor(credits / 20) : 0,
              kamikaze: credits >= 30 ? Math.floor(credits / 30) : 0,
              bomber: credits >= 50 ? Math.floor(credits / 50) : 0
            }}
            spawnDrone={(type) => setDroneSpawnTrigger(type)}
          />

          {/* 2.1 Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <h2 className="text-2xl font-black display-font uppercase tracking-widest text-slate-100 animate-pulse">
                SIMULATION PAUSED
              </h2>
              <p className="text-xs text-slate-400">Press ESC or click below to resume tactical combat.</p>
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => setIsPaused(false)}
                  className="cyber-button green py-3 px-6"
                >
                  RESUME LIVE SIM
                </button>
                <button 
                  onClick={() => setPhase("MENU")}
                  className="cyber-button red py-3 px-6"
                >
                  ABORT MISSION
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Upgrade Shop View */}
      {phase === "UPGRADE" && (
        <UpgradeShop
          mode={mode}
          credits={savedCredits}
          upgrades={upgrades}
          onPurchase={handlePurchaseUpgrade}
          onNextWave={handleNextWave}
          baseHealth={baseHealth}
          onRepairCity={handleRepairBase}
        />
      )}

      {/* 4. Game Over View */}
      {phase === "GAMEOVER" && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden">
          <div className="cyber-grid" />
          
          <div className="glass-panel w-full max-w-md p-8 flex flex-col gap-6 items-center text-center relative z-10">
            {/* Alert Indicator */}
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] text-red-400 font-bold tracking-[0.2em] display-font uppercase">Connection Terminated</span>
              <h1 className="text-3xl font-black text-slate-100 display-font mt-2 tracking-wide uppercase leading-none">
                Mission <span className="text-red-500 red-glow">Aborted</span>
              </h1>
            </div>

            <p className="text-xs text-slate-400">
              {mode === "defense" 
                ? "The city defense networks have collapsed. Command Center is lost." 
                : "The swarm carrier payload is fully depleted. Command operations terminated."}
            </p>

            {/* Score Summary */}
            <div className="glass-panel p-4 w-full bg-slate-900/40 border-slate-800 flex justify-between items-center">
              <div className="text-left">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Tactical Score</span>
                <p className="text-2xl font-black display-font text-slate-100 cyan-glow mt-1">{score}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Waves Cleared</span>
                <p className="text-lg font-bold display-font text-slate-300 mt-1">{wave - 1}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => startGame(mode)}
                className="cyber-button green py-4 flex items-center justify-center gap-2 font-black tracking-widest"
              >
                <RotateCcw className="w-5 h-5" /> RESTART SIMULATION
              </button>
              <button 
                onClick={() => setPhase("MENU")}
                className="cyber-button py-3 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700 bg-transparent"
              >
                RETURN TO HQ MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal Overlay */}
      {showInstructions && (
        <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl p-6 md:p-8 flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-indigo-500/20 pb-3">
              <div className="text-left">
                <h2 className="text-xl font-bold display-font uppercase tracking-wider text-slate-100">
                  TACTICAL SIMULATION MANUAL
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Read manual to synchronize commander protocols</p>
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="cyber-button red py-1.5 px-3 text-xs"
              >
                CLOSE MANUAL
              </button>
            </div>

            {/* Content divided into two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Defense Column */}
              <div className="glass-panel p-4 border-cyan-500/10 flex flex-col gap-3">
                <h3 className="text-sm font-bold display-font text-cyan-400 cyan-glow uppercase flex items-center gap-1.5 border-b border-cyan-500/20 pb-2">
                  <Shield className="w-4 h-4" /> Shield Commander (Defense)
                </h3>
                <ul className="text-xs text-slate-300 space-y-2.5 list-disc list-inside leading-relaxed">
                  <li><strong>Objective</strong>: Protect base structures from incoming drone swarms. If your <strong>Command HQ</strong> is destroyed, the simulation fails!</li>
                  <li><strong>Controls</strong>: Aim with mouse cursor. <strong>Left Click</strong> to fire selected battery.</li>
                  <li><strong>Weapon Select</strong>: Press keyboard keys <strong>[1], [2], [3]</strong> or click weapon buttons in right HUD to switch:
                    <ul className="pl-4 list-square list-inside space-y-1 text-slate-400 mt-1">
                      <li><span className="text-cyan-400 font-bold">Flak Shell (1)</span>: Radial splash blast. Ideal for clearing swarm packs.</li>
                      <li><span className="text-cyan-400 font-bold">Plasma Laser (2)</span>: Instant high-damage hitscan beam. Ideal for heavy bombers. Recharges automatically.</li>
                      <li><span className="text-cyan-400 font-bold">EMP Jammer (3)</span>: Slow bubble that creates a lingering freeze field, disabling drones and stripping shields.</li>
                    </ul>
                  </li>
                  <li><strong>Grid Nodes</strong>: Protect the <strong>Power Grid</strong> (keeps weapons charging at 100% speed) and <strong>Logistics Hub</strong> (provides credit bounties).</li>
                </ul>
              </div>

              {/* Offense Column */}
              <div className="glass-panel p-4 border-orange-500/10 flex flex-col gap-3">
                <h3 className="text-sm font-bold display-font text-orange-400 orange-glow uppercase flex items-center gap-1.5 border-b border-orange-500/20 pb-2">
                  <Target className="w-4 h-4" /> Swarm Commander (Offense)
                </h3>
                <ul className="text-xs text-slate-300 space-y-2.5 list-disc list-inside leading-relaxed">
                  <li><strong>Objective</strong>: Lead a carrier-launched drone swarm to dismantle all automated enemy base defenses.</li>
                  <li><strong>Energy (MW)</strong>: Launching drones consumes energy. Energy regenerates in real time.</li>
                  <li><strong>Squad Deployment</strong>: Click cards in the right HUD sidebar to spawn drones:
                    <ul className="pl-4 list-square list-inside space-y-1 text-slate-400 mt-1">
                      <li><span className="text-orange-400 font-bold">Scout (10 MW)</span>: Fast, cheap interceptors.</li>
                      <li><span className="text-orange-400 font-bold">Decoy (20 MW)</span>: High health; draws automated SAM locks away from bombers.</li>
                      <li><span className="text-orange-400 font-bold">Kamikaze (30 MW)</span>: Explodes directly on target structures for 80 damage.</li>
                      <li><span className="text-orange-400 font-bold">Bomber (50 MW)</span>: Shielded heavy payload drop-ships.</li>
                    </ul>
                  </li>
                  <li><strong>Swarm Targets</strong>: Click Priority buttons in HUD to instruct active drones to focus fire on SAM defenses, Power Grids, Logistics, or Command HQ.</li>
                  <li><strong>Command Tactics</strong>: Deploy EMP Sweep (jams SAMs), Cloak Swarm (renders drones untargetable), or Engine Overdrive (speed boost).</li>
                </ul>
              </div>
            </div>
            
            {/* Quick tips */}
            <div className="text-[10px] text-slate-500 uppercase tracking-widest text-center border-t border-slate-800 pt-3">
              Pro Tip: Buy permanent system upgrades in the Shop between waves using earned bounty credits!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
