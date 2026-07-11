import { 
  Shield, Zap, Radio, Crosshair, Sparkles, ArrowRight, Wrench, ShieldAlert 
} from "lucide-react";

export interface UpgradeState {
  // Defense Mode Upgrades
  flakMaxAmmoLevel: number;
  laserRechargeLevel: number;
  empRadiusLevel: number;
  cityArmorLevel: number;
  
  // Offense Mode Upgrades
  maxEnergyLevel: number;
  energyRegenLevel: number;
  abilityCooldownLevel: number;
  droneHpLevel: number;
}

interface UpgradeShopProps {
  mode: "defense" | "offense";
  credits: number;
  upgrades: UpgradeState;
  onPurchase: (upgradeId: string, cost: number) => void;
  onNextWave: () => void;
  baseHealth: number;
  onRepairCity: (cost: number) => void;
}

export default function UpgradeShop({
  mode,
  credits,
  upgrades,
  onPurchase,
  onNextWave,
  baseHealth,
  onRepairCity
}: UpgradeShopProps) {

  // Defense Upgrade Configs
  const defenseUpgrades = [
    {
      id: "flakMaxAmmoLevel",
      name: "Flak Munitions Expansion",
      desc: "Increases Flak Ammo capacity by +15 per level.",
      icon: Crosshair,
      level: upgrades.flakMaxAmmoLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 150,
      benefit: (lvl: number) => `Capacity: ${30 + lvl * 15} Rds`
    },
    {
      id: "laserRechargeLevel",
      name: "Plasma Laser Overcharge",
      desc: "Speeds up Laser charging speed by 20% per level.",
      icon: Zap,
      level: upgrades.laserRechargeLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 200,
      benefit: (lvl: number) => `Recharge Time: ${(5 * Math.pow(0.8, lvl)).toFixed(1)}s`
    },
    {
      id: "empRadiusLevel",
      name: "EMP Blast Resonators",
      desc: "Expands the Jammer EMP bubble radius by +20% per level.",
      icon: Radio,
      level: upgrades.empRadiusLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 180,
      benefit: (lvl: number) => `Radius: ${100 + lvl * 20}%`
    },
    {
      id: "cityArmorLevel",
      name: "Fortified Structure Armor",
      desc: "All structures take 12% less damage per level.",
      icon: Shield,
      level: upgrades.cityArmorLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 250,
      benefit: (lvl: number) => `Damage Resist: ${lvl * 12}%`
    }
  ];

  // Offense Upgrade Configs
  const offenseUpgrades = [
    {
      id: "maxEnergyLevel",
      name: "Swarm Battery Cells",
      desc: "Increases maximum deployment energy reserves by +50 MW.",
      icon: Zap,
      level: upgrades.maxEnergyLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 150,
      benefit: (lvl: number) => `Max Energy: ${200 + lvl * 50} MW`
    },
    {
      id: "energyRegenLevel",
      name: "Fusion Core Influx",
      desc: "Speeds up energy regeneration by +25% per level.",
      icon: Sparkles,
      level: upgrades.energyRegenLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 200,
      benefit: (lvl: number) => `Regen Rate: ${10 + lvl * 2.5} MW/s`
    },
    {
      id: "abilityCooldownLevel",
      name: "Tactical Subroutines",
      desc: "Reduces Command tactics cooldowns by 15% per level.",
      icon: Radio,
      level: upgrades.abilityCooldownLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 180,
      benefit: (lvl: number) => `Cooldown Factor: ${100 - lvl * 15}%`
    },
    {
      id: "droneHpLevel",
      name: "Shielded Shell Hull",
      desc: "Increases structural integrity (HP) of all swarm drones by 20%.",
      icon: Shield,
      level: upgrades.droneHpLevel,
      maxLevel: 5,
      costFormula: (lvl: number) => (lvl + 1) * 250,
      benefit: (lvl: number) => `Drone HP: +${lvl * 20}%`
    }
  ];

  const currentList = mode === "defense" ? defenseUpgrades : offenseUpgrades;
  const repairCost = 150;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="cyber-grid" />

      {/* Main Container */}
      <div className="glass-panel w-full max-w-4xl p-8 flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-500/20 pb-4 gap-4">
          <div>
            <span className={`text-[10px] font-bold tracking-widest uppercase display-font px-2 py-0.5 rounded border ${
              mode === "defense" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-orange-500/10 border-orange-500/20 text-orange-400"
            }`}>
              {mode === "defense" ? "Tactical Defense Command" : "Swarm Strike Coordinator"}
            </span>
            <h1 className="text-3xl font-black text-slate-100 display-font mt-2 tracking-wide uppercase">
              Upgrade Shop <span className={mode === "defense" ? "text-cyan-400" : "text-orange-400"}>HQ</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Credits Available</span>
              <span className={`text-2xl font-black display-font ${mode === "defense" ? "cyan-glow text-cyan-400" : "orange-glow text-orange-400"}`}>
                {mode === "defense" ? `$${credits}` : `${credits} MW`}
              </span>
            </div>
            <button 
              onClick={onNextWave}
              className={`cyber-button ${mode === "defense" ? "cyan" : "orange"} py-4 px-6 flex items-center gap-2 font-black tracking-widest`}
            >
              LAUNCH NEXT WAVE <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Repair City Block (For Defense Mode) / Reinforce Command Block */}
        {baseHealth < 100 && (
          <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-red-500 bg-red-500/5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-200 display-font uppercase tracking-wider">
                  {mode === "defense" ? "City Integrity Compromised" : "Swarm Command Hull Damaged"}
                </h3>
                <p className="text-xs text-slate-400">
                  {mode === "defense" 
                    ? `Integrity stands at ${baseHealth}%. Deploy nano-constructors to repair +25% integrity.`
                    : `Command Hull is at ${baseHealth}%. Deploy repair nanites to patch +25% hull strength.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 uppercase">Cost: ${repairCost}</span>
              <button
                disabled={credits < repairCost}
                onClick={() => onRepairCity(repairCost)}
                className={`py-2 px-4 rounded border text-xs font-bold display-font transition-all ${
                  credits >= repairCost
                    ? "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                    : "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                }`}
              >
                DEPLOY REPAIRS
              </button>
            </div>
          </div>
        )}

        {/* Upgrades List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((item) => {
            const cost = item.costFormula(item.level);
            const isMax = item.level >= item.maxLevel;
            const canAfford = credits >= cost && !isMax;

            return (
              <div key={item.id} className="glass-panel p-5 flex flex-col justify-between gap-4 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 transition-all relative">
                
                {/* Upgrade Title & Stats */}
                <div className="flex gap-4">
                  <div className={`p-3 rounded-lg border flex items-center justify-center shrink-0 w-12 h-12 ${
                    mode === "defense" ? "border-cyan-500/20 bg-cyan-500/5" : "border-orange-500/20 bg-orange-500/5"
                  }`}>
                    <item.icon className={`w-6 h-6 ${mode === "defense" ? "text-cyan-400" : "text-orange-400"}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-slate-100 display-font uppercase tracking-wide">
                        {item.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 uppercase font-bold display-font">
                        Lvl {item.level}/{item.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                {/* Upgrade Stats Progress Indicators */}
                <div className="flex flex-col gap-2 border-t border-b border-slate-800 py-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-slate-500">Current Spec:</span>
                    <span className={mode === "defense" ? "text-cyan-400" : "text-orange-400"}>
                      {item.benefit(item.level)}
                    </span>
                  </div>
                  
                  <div className="flex gap-1.5 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
                    {Array.from({ length: item.maxLevel }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-full ${
                          i < item.level 
                            ? (mode === "defense" ? "bg-cyan-500" : "bg-orange-500") 
                            : "bg-slate-900"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {isMax ? "SPEC FULLY UPGRADED" : `UPGRADE COST:`}
                  </span>
                  
                  {!isMax ? (
                    <button
                      disabled={!canAfford}
                      onClick={() => onPurchase(item.id, cost)}
                      className={`py-2.5 px-5 rounded border text-xs font-bold display-font tracking-wider transition-all flex items-center gap-1.5 ${
                        canAfford
                          ? mode === "defense"
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white"
                            : "border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white"
                          : "border-slate-850 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {mode === "defense" ? `$${cost}` : `${cost} MW`}
                    </button>
                  ) : (
                    <span className={`text-xs font-bold display-font ${mode === "defense" ? "text-cyan-500" : "text-orange-500"}`}>
                      MAX LEVEL
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
