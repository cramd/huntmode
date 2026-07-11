import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { UpgradeState } from "./UpgradeShop";

interface GameCanvasProps {
  mode: "defense" | "offense";
  wave: number;
  upgrades: UpgradeState;
  
  // Defense Mode
  selectedWeapon: "flak" | "laser" | "emp";
  onWeaponFired: (weapon: "flak" | "laser" | "emp") => void;
  batteryAmmo: { flak: number; laser: number; emp: number };
  batteryCooldowns: { flak: number; laser: number; emp: number };
  setBatteryCooldowns: Dispatch<SetStateAction<{ flak: number; laser: number; emp: number }>>;
  setBatteryAmmo: Dispatch<SetStateAction<{ flak: number; laser: number; emp: number }>>;
  powerPlantActive: boolean;
  setPowerPlantActive: (active: boolean) => void;
  logisticsActive: boolean;
  setLogisticsActive: (active: boolean) => void;

  // Offense Mode
  targetPriority: "defense" | "power" | "logistics" | "command";
  droneSpawnTrigger: "scout" | "decoy" | "kamikaze" | "bomber" | null;
  onDroneSpawned: () => void;
  abilityTrigger: "emp" | "cloak" | "speed" | null;
  onAbilityTriggered: () => void;
  droneSpawnCost: (type: "scout" | "decoy" | "kamikaze" | "bomber") => number;
  credits: number;
  setCredits: Dispatch<SetStateAction<number>>;

  // Shared
  addLog: (text: string, type: "system" | "defense" | "offense" | "danger" | "success") => void;
  onGameOver: (score: number) => void;
  onWaveComplete: (earnedCredits: number) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  baseHealth: number;
  setBaseHealth: (health: number) => void;
  isPaused: boolean;
}

// Procedural Particle Class for Debris
class Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 3 + 1;
    this.color = color;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.02 + 0.01;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // gravity
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Procedural Projectile Class
class Projectile {
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: "flak" | "emp" | "bomb" | "sam";
  radius: number;
  explodeRadius: number;
  isDone: boolean;
  damage: number;

  constructor(x: number, y: number, targetX: number, targetY: number, type: "flak" | "emp" | "bomb" | "sam", speed: number, explodeRadius = 60, damage = 100) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.type = type;
    this.speed = speed;
    this.radius = type === "bomb" ? 4 : 2;
    this.explodeRadius = explodeRadius;
    this.isDone = false;
    this.damage = damage;
  }

  update() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.isDone = true;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.type === "flak") {
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "emp") {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      
      ctx.fillStyle = "#818cf8";
      ctx.shadowColor = "#6366f1";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "bomb") {
      ctx.fillStyle = "#f97316";
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "sam") {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Procedural Explosion Class
class Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growSpeed: number;
  type: "flak" | "emp" | "sam" | "impact";
  isDone: boolean;
  alpha: number;
  duration: number; // For lingering EMP
  maxDuration: number;

  constructor(x: number, y: number, maxRadius: number, type: "flak" | "emp" | "sam" | "impact") {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.growSpeed = type === "emp" ? maxRadius / 25 : maxRadius / 15;
    this.type = type;
    this.isDone = false;
    this.alpha = 1.0;
    this.duration = 0;
    this.maxDuration = type === "emp" ? 150 : 0; // EMP lingers for 150 frames (2.5s)
  }

  update() {
    if (this.radius < this.maxRadius) {
      this.radius += this.growSpeed;
    } else {
      if (this.duration < this.maxDuration) {
        this.duration++;
        // pulse radius slightly
        this.radius = this.maxRadius + Math.sin(this.duration * 0.1) * 3;
      } else {
        this.alpha -= 0.05;
        if (this.alpha <= 0) {
          this.isDone = true;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    if (this.type === "flak" || this.type === "impact") {
      const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.2, this.x, this.y, this.radius);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.2, "#22d3ee");
      gradient.addColorStop(0.6, "rgba(6, 182, 212, 0.3)");
      gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "emp") {
      ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
      ctx.shadowColor = "#6366f1";
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.05)");
      gradient.addColorStop(0.8, "rgba(99, 102, 241, 0.15)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Electric spark arcs inside
      if (Math.random() < 0.3) {
        ctx.strokeStyle = "#a5b4fc";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const numArcs = 4;
        for (let i = 0; i < numArcs; i++) {
          const arcAngle = Math.random() * Math.PI * 2;
          const arcRadius = Math.random() * this.radius;
          const sx = this.x + Math.cos(arcAngle) * (arcRadius * 0.5);
          const sy = this.y + Math.sin(arcAngle) * (arcRadius * 0.5);
          ctx.moveTo(sx, sy);
          ctx.lineTo(
            sx + (Math.random() - 0.5) * 15,
            sy + (Math.random() - 0.5) * 15
          );
        }
        ctx.stroke();
      }
    } else if (this.type === "sam") {
      const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.3, "#f97316");
      gradient.addColorStop(0.7, "rgba(239, 68, 68, 0.3)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Procedural Drone Entity
class Drone {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  type: "scout" | "decoy" | "kamikaze" | "bomber" | "enemy_scout" | "enemy_swarm" | "enemy_bomber" | "enemy_shielded";
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  isDone: boolean;
  color: string;
  hasShield: boolean;
  shieldHP: number;
  zigzagAmp: number;
  zigzagOffset: number;
  bombCooldown: number = 0;
  bombTimer: number = 0;
  isStunned: boolean;
  stunTimer: number;
  isCloaked: boolean;
  angle: number;

  constructor(x: number, y: number, targetX: number, targetY: number, type: any, baseHpMultiplier = 1.0, speedMultiplier = 1.0) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.type = type;
    this.isDone = false;
    this.isStunned = false;
    this.stunTimer = 0;
    this.isCloaked = false;
    this.angle = 0;

    // Type configuration
    switch (type) {
      case "scout":
        this.maxHp = 20 * baseHpMultiplier;
        this.speed = 3.5 * speedMultiplier;
        this.size = 12;
        this.color = "#fb923c"; // Orange
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 2;
        this.zigzagOffset = Math.random() * 100;
        break;
      case "decoy":
        this.maxHp = 180 * baseHpMultiplier;
        this.speed = 1.8 * speedMultiplier;
        this.size = 18;
        this.color = "#38bdf8"; // Cyan/Blue
        this.hasShield = true;
        this.shieldHP = 100;
        this.zigzagAmp = 0;
        this.zigzagOffset = 0;
        break;
      case "kamikaze":
        this.maxHp = 30 * baseHpMultiplier;
        this.speed = 4.5 * speedMultiplier;
        this.size = 10;
        this.color = "#ef4444"; // Red
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 4;
        this.zigzagOffset = Math.random() * 100;
        break;
      case "bomber":
        this.maxHp = 100 * baseHpMultiplier;
        this.speed = 1.2 * speedMultiplier;
        this.size = 20;
        this.color = "#a855f7"; // Purple
        this.hasShield = true;
        this.shieldHP = 50;
        this.zigzagAmp = 0;
        this.zigzagOffset = 0;
        this.bombCooldown = 180; // 3 seconds
        this.bombTimer = Math.random() * 100;
        break;

      // Enemy Drones (for Defense Mode)
      case "enemy_scout":
        this.maxHp = 25;
        this.speed = 1.8;
        this.size = 12;
        this.color = "#fb7185"; // Rose
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 1.5;
        this.zigzagOffset = Math.random() * 100;
        break;
      case "enemy_swarm":
        this.maxHp = 10;
        this.speed = 2.4;
        this.size = 8;
        this.color = "#f43f5e"; // Rose bright
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 3;
        this.zigzagOffset = Math.random() * 100;
        break;
      case "enemy_bomber":
        this.maxHp = 120;
        this.speed = 0.8;
        this.size = 18;
        this.color = "#e11d48"; // Crimson
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 0;
        this.zigzagOffset = 0;
        this.bombCooldown = 200;
        this.bombTimer = Math.random() * 100;
        break;
      case "enemy_shielded":
        this.maxHp = 50;
        this.speed = 1.3;
        this.size = 14;
        this.color = "#fda4af"; // Soft pink
        this.hasShield = true;
        this.shieldHP = 40;
        this.zigzagAmp = 0.5;
        this.zigzagOffset = Math.random() * 100;
        break;
      default:
        this.maxHp = 20;
        this.speed = 2.0;
        this.size = 12;
        this.color = "#fff";
        this.hasShield = false;
        this.shieldHP = 0;
        this.zigzagAmp = 0;
        this.zigzagOffset = 0;
    }
    this.hp = this.maxHp;
  }

  update(gridY: number) {
    if (this.isStunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed || this.y >= gridY) {
      this.isDone = true;
    } else {
      let vx = (dx / dist) * this.speed;
      let vy = (dy / dist) * this.speed;

      // Apply zigzag offset perpendicular to path
      if (this.zigzagAmp > 0) {
        const perpX = -vy;
        const perpY = vx;
        const normPerpDist = Math.sqrt(perpX * perpX + perpY * perpY);
        if (normPerpDist > 0) {
          const wave = Math.sin((this.y + this.zigzagOffset) * 0.08) * this.zigzagAmp;
          vx += (perpX / normPerpDist) * wave;
          vy += (perpY / normPerpDist) * wave;
        }
      }

      this.x += vx;
      this.y += vy;
      this.angle = Math.atan2(vy, vx);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.hasShield && this.shieldHP > 0) {
      this.shieldHP -= amount;
      if (this.shieldHP <= 0) {
        this.hasShield = false;
      }
      return false; // Drone is alive, shield took damage
    }
    this.hp -= amount;
    return this.hp <= 0; // True if destroyed
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Cloaking transparency
    if (this.isCloaked) {
      ctx.globalAlpha = 0.25;
    } else if (this.isStunned) {
      ctx.globalAlpha = 0.8;
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2); // Orient model

    // Draw Drone Body (Cybernetic triangle/insect shape)
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(11, 19, 41, 0.8)";
    
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size * 0.6, this.size * 0.6);
    ctx.lineTo(0, this.size * 0.2);
    ctx.lineTo(-this.size * 0.6, this.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wings
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.4, 0);
    ctx.lineTo(-this.size * 1.1, -this.size * 0.3);
    ctx.lineTo(-this.size * 1.0, 0);
    ctx.moveTo(this.size * 0.4, 0);
    ctx.lineTo(this.size * 1.1, -this.size * 0.3);
    ctx.lineTo(this.size * 1.0, 0);
    ctx.stroke();

    // Thruster flame
    if (!this.isStunned && Math.random() < 0.6) {
      ctx.fillStyle = this.type.toString().startsWith("enemy") ? "#f43f5e" : "#f97316";
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.2, this.size * 0.4);
      ctx.lineTo(0, this.size * (0.4 + Math.random() * 0.4));
      ctx.lineTo(this.size * 0.2, this.size * 0.4);
      ctx.closePath();
      ctx.fill();
    }

    // Shield Bubble
    if (this.hasShield && this.shieldHP > 0) {
      ctx.strokeStyle = "rgba(6, 182, 212, 0.6)";
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stun FX
    if (this.isStunned) {
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.1, this.stunTimer * 0.1, this.stunTimer * 0.1 + Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Procedural structures to protect/destroy at the bottom
interface Structure {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  maxHp: number;
  hp: number;
  active: boolean;
  color: string;
}

export default function GameCanvas({
  mode,
  wave,
  upgrades,
  selectedWeapon,
  onWeaponFired,
  batteryAmmo,
  batteryCooldowns,
  setBatteryCooldowns,
  setBatteryAmmo,
  powerPlantActive,
  setPowerPlantActive,
  logisticsActive,
  setLogisticsActive,

  targetPriority,
  droneSpawnTrigger,
  onDroneSpawned,
  abilityTrigger,
  onAbilityTriggered,
  droneSpawnCost,
  credits,
  setCredits,

  addLog,
  onGameOver,
  onWaveComplete,
  score,
  setScore,
  setBaseHealth,
  isPaused
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state variables
  const [screenShake, setScreenShake] = useState(0);
  
  // Game loops lists (Stored in refs to prevent closures capturing old React state)
  const stateRef = useRef({
    drones: [] as Drone[],
    projectiles: [] as Projectile[],
    explosions: [] as Explosion[],
    debrisList: [] as Debris[],
    structures: [] as Structure[],
    laserBeam: null as { sx: number; sy: number; tx: number; ty: number; duration: number } | null,
    
    // Wave spawn states
    waveSpawnedCount: 0,
    waveTotalDrones: 0,
    spawnInterval: 0,
    spawnTimer: 0,
    waveActive: false,
    waveCooldown: 120, // Frames before starting next wave
    offenseScoreEarned: 0,
    offenseSAMCooldowns: [] as number[], // Lock timers for automated defense turrets
    
    // Abilities state
    activeCloakTimer: 0,
    activeSpeedTimer: 0,
    activeEMPTimer: 0
  });

  const getUpgradeFactor = (level: number) => 1.0 + level * 0.2;
  const getReductionFactor = (level: number) => Math.pow(0.85, level);

  // Initialize City/Base structures
  const initStructures = () => {
    const sList: Structure[] = [
      { id: "power", x: 200, y: 740, width: 90, height: 60, name: "Power Grid", maxHp: 100, hp: 100, active: true, color: "#10b981" },
      { id: "logistics", x: 420, y: 730, width: 100, height: 70, name: "Logistics Hub", maxHp: 120, hp: 120, active: true, color: "#f97316" },
      { id: "habitats", x: 680, y: 750, width: 120, height: 50, name: "Civilian Habitat", maxHp: 80, hp: 80, active: true, color: "#06b6d4" },
      { id: "command", x: 920, y: 710, width: 110, height: 90, name: "Command HQ", maxHp: 200, hp: 200, active: true, color: "#6366f1" }
    ];
    stateRef.current.structures = sList;
    setBaseHealth(100);
    setPowerPlantActive(true);
    setLogisticsActive(true);
  };

  // Triggered when structural health updates
  const updateBaseHealthState = () => {
    const totalMax = stateRef.current.structures.reduce((acc, s) => acc + s.maxHp, 0);
    const totalCurrent = stateRef.current.structures.reduce((acc, s) => acc + s.hp, 0);
    const percentage = Math.max(0, Math.round((totalCurrent / totalMax) * 100));
    setBaseHealth(percentage);
    
    // Update individual active states
    const power = stateRef.current.structures.find(s => s.id === "power");
    if (power) {
      if (power.hp <= 0 && powerPlantActive) {
        setPowerPlantActive(false);
        addLog("GRID offline! Weapon cooldown speeds reduced by 40%", "danger");
      } else if (power.hp > 0 && !powerPlantActive) {
        setPowerPlantActive(true);
      }
    }

    const logis = stateRef.current.structures.find(s => s.id === "logistics");
    if (logis) {
      if (logis.hp <= 0 && logisticsActive) {
        setLogisticsActive(false);
        addLog("LOGISTICS core compromised! Bounty credits reduced by 30%", "danger");
      } else if (logis.hp > 0 && !logisticsActive) {
        setLogisticsActive(true);
      }
    }

    // CommandHQ destroyed = Game Over
    const command = stateRef.current.structures.find(s => s.id === "command");
    if (command && command.hp <= 0) {
      onGameOver(score);
    }
  };

  // Setup/Resize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      canvas.width = rect?.width || 1200;
      canvas.height = rect?.height || 800;
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    initStructures();

    // Start wave parameters
    stateRef.current.waveActive = true;
    stateRef.current.waveSpawnedCount = 0;
    stateRef.current.waveTotalDrones = 5 + wave * 3;
    stateRef.current.spawnInterval = Math.max(45, 120 - wave * 10); // Spawn faster in later waves

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [wave, mode]);

  // Handle Offense Mode Spawning Trigger
  useEffect(() => {
    if (mode === "offense" && droneSpawnTrigger) {
      const cost = droneSpawnCost(droneSpawnTrigger);
      if (credits >= cost) {
        setCredits(prev => prev - cost);
        
        // Spawn a drone at the top
        const startX = Math.random() * 1000 + 100;
        
        // Find prioritized structure
        let targetStruct = stateRef.current.structures.find(s => s.id === targetPriority && s.hp > 0);
        if (!targetStruct) {
          // Find first active structure
          targetStruct = stateRef.current.structures.find(s => s.hp > 0);
        }
        
        if (targetStruct) {
          const hpMultiplier = getUpgradeFactor(upgrades.droneHpLevel);
          const speedMultiplier = stateRef.current.activeSpeedTimer > 0 ? 1.6 : 1.0;
          const newDrone = new Drone(
            startX, 
            30, 
            targetStruct.x + targetStruct.width / 2, 
            targetStruct.y, 
            droneSpawnTrigger,
            hpMultiplier,
            speedMultiplier
          );
          
          if (stateRef.current.activeCloakTimer > 0) {
            newDrone.isCloaked = true;
          }
          
          stateRef.current.drones.push(newDrone);
          addLog(`Deployed ${droneSpawnTrigger.toUpperCase()} squadron`, "offense");
        }
      }
      onDroneSpawned();
    }
  }, [droneSpawnTrigger, targetPriority, mode, credits]);

  // Handle Offense Active Abilities Trigger
  useEffect(() => {
    if (mode === "offense" && abilityTrigger) {
      if (abilityTrigger === "emp") {
        stateRef.current.activeEMPTimer = 300; // 5 seconds of EMP sweep
        // Spawn orbital sweep visual lines
        stateRef.current.explosions.push(new Explosion(600, 300, 800, "emp"));
        addLog("Orbital EMP activated: Defensive SAM batteries jammed!", "success");
      } else if (abilityTrigger === "cloak") {
        stateRef.current.activeCloakTimer = 180; // 3 seconds
        stateRef.current.drones.forEach(d => d.isCloaked = true);
        addLog("Swarm Cloak operational: Radar signature hidden", "success");
      } else if (abilityTrigger === "speed") {
        stateRef.current.activeSpeedTimer = 240; // 4 seconds
        stateRef.current.drones.forEach(d => d.speed *= 1.6);
        addLog("Engine Overdrive active: Drone velocities boosted", "success");
      }
      onAbilityTriggered();
    }
  }, [abilityTrigger, mode]);

  // Handle click to shoot (Defensive Mode)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "defense" || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Map mouse click to 1200x800 game space
    const clickX = ((e.clientX - rect.left) / rect.width) * 1200;
    const clickY = ((e.clientY - rect.top) / rect.height) * 800;

    // Prevent shooting below the ground grid
    if (clickY > 700) return;

    if (selectedWeapon === "flak") {
      if (batteryAmmo.flak <= 0) {
        addLog("Flak Ammo Depleted!", "danger");
        return;
      }
      if (batteryCooldowns.flak > 0) return;

      setBatteryAmmo(prev => ({ ...prev, flak: prev.flak - 1 }));
      const cooldownVal = powerPlantActive ? 15 : 25; // slower without power
      setBatteryCooldowns(prev => ({ ...prev, flak: cooldownVal }));
      onWeaponFired("flak");

      // Right Battery position is x:1050, y:720
      stateRef.current.projectiles.push(
        new Projectile(1050, 720, clickX, clickY, "flak", 10, 60 + upgrades.empRadiusLevel * 10)
      );
    } 
    
    else if (selectedWeapon === "laser") {
      if (batteryAmmo.laser <= 0) return;
      if (batteryCooldowns.laser > 0) return;

      // Find if clicked on any drone
      const clickedDrone = stateRef.current.drones.find(d => {
        const dx = d.x - clickX;
        const dy = d.y - clickY;
        return Math.sqrt(dx * dx + dy * dy) < d.size * 2;
      });

      if (!clickedDrone) {
        // Laser missed, hit position anyway
        stateRef.current.laserBeam = { sx: 600, sy: 710, tx: clickX, ty: clickY, duration: 15 };
        setBatteryCooldowns(prev => ({ ...prev, laser: 100 }));
        return;
      }

      setBatteryCooldowns(prev => ({ ...prev, laser: 100 }));
      onWeaponFired("laser");

      // Center Battery position is x:600, y:710
      stateRef.current.laserBeam = { sx: 600, sy: 710, tx: clickedDrone.x, ty: clickedDrone.y, duration: 15 };
      
      const dmg = 150;
      const destroyed = clickedDrone.takeDamage(dmg);
      if (destroyed) {
        const index = stateRef.current.drones.indexOf(clickedDrone);
        if (index > -1) {
          stateRef.current.drones.splice(index, 1);
          // Spawn debris
          for (let i = 0; i < 8; i++) {
            stateRef.current.debrisList.push(new Debris(clickedDrone.x, clickedDrone.y, clickedDrone.color));
          }
          const earned = logisticsActive ? 20 : 14;
          setCredits(prev => prev + earned);
          setScore(prev => prev + 100);
          addLog(`Laser vaporized enemy Bomber (+${earned} credits)`, "success");
        }
      } else {
        addLog("Laser hit shielded core - absorbing impact", "defense");
      }
    } 
    
    else if (selectedWeapon === "emp") {
      if (batteryAmmo.emp <= 0) {
        addLog("EMP Charges Depleted!", "danger");
        return;
      }
      if (batteryCooldowns.emp > 0) return;

      setBatteryAmmo(prev => ({ ...prev, emp: prev.emp - 1 }));
      setBatteryCooldowns(prev => ({ ...prev, emp: 40 }));
      onWeaponFired("emp");

      // Left Battery position is x:150, y:740
      stateRef.current.projectiles.push(
        new Projectile(150, 740, clickX, clickY, "emp", 6, 120 + upgrades.empRadiusLevel * 20)
      );
    }
  };

  // Main game loop logic
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // We map logical 1200x800 game space to real canvas size
      const scaleX = canvas.width / 1200;
      const scaleY = canvas.height / 800;

      ctx.save();
      ctx.scale(scaleX, scaleY);

      // Apply screen shake
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        setScreenShake(prev => Math.max(0, prev - 0.5));
      }

      // Draw Grid Background
      ctx.strokeStyle = "rgba(18, 24, 38, 0.4)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < 1200; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 800);
        ctx.stroke();
      }
      for (let y = 0; y < 800; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // 1. Spawning Mechanics
      if (mode === "defense" && stateRef.current.waveActive) {
        stateRef.current.spawnTimer++;
        if (stateRef.current.spawnTimer >= stateRef.current.spawnInterval && stateRef.current.waveSpawnedCount < stateRef.current.waveTotalDrones) {
          stateRef.current.spawnTimer = 0;
          stateRef.current.waveSpawnedCount++;

          // Select drone class
          const rand = Math.random();
          let droneType: any = "enemy_scout";
          if (wave >= 2 && rand > 0.8) droneType = "enemy_swarm";
          if (wave >= 3 && rand > 0.5 && rand <= 0.8) droneType = "enemy_shielded";
          if (wave >= 4 && rand <= 0.2) droneType = "enemy_bomber";

          // Spawn point
          const sx = Math.random() * 1000 + 100;
          
          // Target a random active building
          const activeStructures = stateRef.current.structures.filter(s => s.hp > 0);
          if (activeStructures.length > 0) {
            const randStructure = activeStructures[Math.floor(Math.random() * activeStructures.length)];
            const tx = randStructure.x + randStructure.width / 2;
            const ty = randStructure.y;

            stateRef.current.drones.push(new Drone(sx, -20, tx, ty, droneType));
            if (stateRef.current.waveSpawnedCount === 1) {
              addLog(`Swarm warning: Wave ${wave} inbound!`, "danger");
            }
          }
        }
      }

      // 2. Update and Draw Projectiles
      for (let i = stateRef.current.projectiles.length - 1; i >= 0; i--) {
        const p = stateRef.current.projectiles[i];
        p.update();
        p.draw(ctx);

        if (p.isDone) {
          stateRef.current.projectiles.splice(i, 1);
          // Trigger explosion
          if (p.type === "flak") {
            stateRef.current.explosions.push(new Explosion(p.x, p.y, p.explodeRadius, "flak"));
          } else if (p.type === "emp") {
            stateRef.current.explosions.push(new Explosion(p.x, p.y, p.explodeRadius, "emp"));
          } else if (p.type === "sam") {
            stateRef.current.explosions.push(new Explosion(p.x, p.y, 40, "sam"));
          } else if (p.type === "bomb") {
            // Bomb hits target building
            stateRef.current.explosions.push(new Explosion(p.x, p.y, 30, "impact"));
            // Find building
            const hitBuilding = stateRef.current.structures.find(s => 
              p.x >= s.x && p.x <= s.x + s.width && s.hp > 0
            );
            if (hitBuilding) {
              const armorReduction = mode === "defense" ? getReductionFactor(upgrades.cityArmorLevel) : 1.0;
              const dmg = Math.round(p.damage * armorReduction);
              hitBuilding.hp = Math.max(0, hitBuilding.hp - dmg);
              setScreenShake(8);
              addLog(`${hitBuilding.name} struck! HP reduced (-${dmg})`, "danger");
              updateBaseHealthState();
            }
          }
        }
      }

      // 3. Update and Draw Laser Beam visual (Defense mode)
      if (stateRef.current.laserBeam) {
        const lb = stateRef.current.laserBeam;
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(lb.sx, lb.sy);
        ctx.lineTo(lb.tx, lb.ty);
        ctx.stroke();

        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lb.sx, lb.sy);
        ctx.lineTo(lb.tx, lb.ty);
        ctx.stroke();
        ctx.restore();

        lb.duration--;
        if (lb.duration <= 0) {
          stateRef.current.laserBeam = null;
        }
      }

      // 4. Update and Draw Explosions & Check Collision with Drones
      for (let i = stateRef.current.explosions.length - 1; i >= 0; i--) {
        const exp = stateRef.current.explosions[i];
        exp.update();
        exp.draw(ctx);

        // Check if explosion hits drones (Defense Mode)
        if (mode === "defense" && (exp.type === "flak" || exp.type === "emp")) {
          stateRef.current.drones.forEach(d => {
            const dx = d.x - exp.x;
            const dy = d.y - exp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < exp.radius + d.size) {
              if (exp.type === "flak") {
                const destroyed = d.takeDamage(1.8); // Deal continuous damage while inside flak explosion
                if (destroyed) {
                  const idx = stateRef.current.drones.indexOf(d);
                  if (idx > -1) {
                    stateRef.current.drones.splice(idx, 1);
                    // Spawn debris
                    for (let j = 0; j < 5; j++) {
                      stateRef.current.debrisList.push(new Debris(d.x, d.y, d.color));
                    }
                    const earned = logisticsActive ? 12 : 8;
                    setCredits(prev => prev + earned);
                    setScore(prev => prev + 50);
                    addLog(`Flak vaporized ${d.type.split("_")[1].toUpperCase()} (+${earned} credits)`, "success");
                  }
                }
              } else if (exp.type === "emp") {
                // EMP jams/stuns drone and drains shield
                d.isStunned = true;
                d.stunTimer = 180; // 3 seconds stun
                if (d.hasShield) {
                  d.shieldHP = 0;
                  d.hasShield = false;
                  addLog(`EMP collapsed ${d.type.split("_")[1].toUpperCase()} shields`, "defense");
                }
              }
            }
          });
        }

        // Check if SAM explosion hits player's drones (Offense Mode)
        if (mode === "offense" && exp.type === "sam") {
          for (let dIdx = stateRef.current.drones.length - 1; dIdx >= 0; dIdx--) {
            const d = stateRef.current.drones[dIdx];
            const dx = d.x - exp.x;
            const dy = d.y - exp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < exp.radius + d.size) {
              const destroyed = d.takeDamage(2.0); // Continuous flak damage
              if (destroyed) {
                stateRef.current.drones.splice(dIdx, 1);
                for (let j = 0; j < 5; j++) {
                  stateRef.current.debrisList.push(new Debris(d.x, d.y, d.color));
                }
                addLog(`Squadron drone ${d.type.toUpperCase()} shot down!`, "danger");
              }
            }
          }
        }

        if (exp.isDone) {
          stateRef.current.explosions.splice(i, 1);
        }
      }

      // 5. Update and Draw Drones
      for (let i = stateRef.current.drones.length - 1; i >= 0; i--) {
        const d = stateRef.current.drones[i];
        d.update(710); // Move down
        d.draw(ctx);

        // For Offense Mode: Bomber Drones spawn bombs periodically
        if (mode === "offense" && d.type === "bomber") {
          d.bombTimer++;
          if (d.bombTimer >= d.bombCooldown && !d.isStunned) {
            d.bombTimer = 0;
            // Drop a bomb towards their target
            stateRef.current.projectiles.push(
              new Projectile(d.x, d.y, d.targetX, d.targetY, "bomb", 2, 30, 45)
            );
            addLog("Bomber payload released!", "offense");
          }
        }

        // For Defense Mode: Enemy bombers release bombs
        if (mode === "defense" && d.type === "enemy_bomber") {
          d.bombTimer++;
          if (d.bombTimer >= d.bombCooldown && !d.isStunned) {
            d.bombTimer = 0;
            stateRef.current.projectiles.push(
              new Projectile(d.x, d.y, d.targetX, d.targetY, "bomb", 1.8, 30, 50)
            );
            addLog("Radar warning: Enemy Bomber payload dropped!", "danger");
          }
        }

        // If drone reaches target building or bottom grid
        if (d.isDone) {
          stateRef.current.drones.splice(i, 1);

          // Impact structures (for Defense Mode)
          if (mode === "defense") {
            const hitBuilding = stateRef.current.structures.find(s => 
              d.x >= s.x && d.x <= s.x + s.width && s.hp > 0
            );

            const impactDmg = d.type === "enemy_bomber" ? 60 : d.type === "enemy_shielded" ? 35 : 20;
            const armorResist = getReductionFactor(upgrades.cityArmorLevel);
            const dmg = Math.round(impactDmg * armorResist);

            if (hitBuilding) {
              hitBuilding.hp = Math.max(0, hitBuilding.hp - dmg);
              setScreenShake(12);
              addLog(`COLLISION! ${hitBuilding.name} hit by Kamikaze drone (-${dmg})`, "danger");
              updateBaseHealthState();
            } else {
              // Hit ground, damage random structure
              const activeBuildings = stateRef.current.structures.filter(s => s.hp > 0);
              if (activeBuildings.length > 0) {
                const randomB = activeBuildings[Math.floor(Math.random() * activeBuildings.length)];
                randomB.hp = Math.max(0, randomB.hp - dmg);
                setScreenShake(6);
                addLog(`Impact explosion damaged ${randomB.name} (-${dmg})`, "danger");
                updateBaseHealthState();
              }
            }
          } 
          
          // Impact structures (for Offense Mode, kamikaze drone impacts)
          else if (mode === "offense") {
            const hitBuilding = stateRef.current.structures.find(s => 
              d.x >= s.x && d.x <= s.x + s.width && s.hp > 0
            );

            if (hitBuilding) {
              if (d.type === "kamikaze") {
                hitBuilding.hp = Math.max(0, hitBuilding.hp - 80);
                stateRef.current.explosions.push(new Explosion(d.x, d.y, 60, "impact"));
                setScreenShake(10);
                addLog(`DIRECT HIT! Kamikaze decimated ${hitBuilding.name} (-80 HP)`, "success");
              } else {
                // Non-kamikaze drones colliding with target deals slight damage
                hitBuilding.hp = Math.max(0, hitBuilding.hp - 20);
                stateRef.current.explosions.push(new Explosion(d.x, d.y, 30, "impact"));
                addLog(`${d.type.toUpperCase()} drone crash impacted ${hitBuilding.name} (-20 HP)`, "success");
              }
              
              // Add tactical score
              setScore(prev => prev + 150);
              // Earn credits for damaging bases in Offense mode
              const bounty = logisticsActive ? 30 : 21;
              setCredits(prev => prev + bounty);
              updateBaseHealthState();

              // Check if all structures destroyed (Victory for Offense mode)
              const activeBuildingsCount = stateRef.current.structures.filter(s => s.hp > 0).length;
              if (activeBuildingsCount === 0) {
                onWaveComplete(Math.round(400 + wave * 100));
              }
            }
          }
        }
      }

      // 6. Update and Draw Debris
      for (let i = stateRef.current.debrisList.length - 1; i >= 0; i--) {
        const d = stateRef.current.debrisList[i];
        d.update();
        d.draw(ctx);
        if (d.alpha <= 0) {
          stateRef.current.debrisList.splice(i, 1);
        }
      }

      // 7. Offense Mode: Automated SAM Batteries Defending Base
      if (mode === "offense" && stateRef.current.waveActive) {
        // We have 3 SAM launchers: x:150 (Left Battery), x:600 (Center Battery), x:1050 (Right Battery)
        // If orbital EMP sweep is active, defenses are disabled (EMP Timer > 0)
        if (stateRef.current.activeEMPTimer > 0) {
          stateRef.current.activeEMPTimer--;
        } else {
          // Initialize SAM cooldowns if empty
          if (stateRef.current.offenseSAMCooldowns.length === 0) {
            stateRef.current.offenseSAMCooldowns = [0, 0, 0];
          }

          const samPositions = [150, 600, 1050];
          
          // Let turrets check lock-on and fire
          for (let idx = 0; idx < 3; idx++) {
            if (stateRef.current.offenseSAMCooldowns[idx] > 0) {
              stateRef.current.offenseSAMCooldowns[idx]--;
            } else {
              // Find targets that are not cloaked
              const targetableDrones = stateRef.current.drones.filter(d => !d.isCloaked);
              if (targetableDrones.length > 0) {
                // Priority Lock: SAMs target DECOY drones first, then closest
                let lockTarget = targetableDrones.find(d => d.type === "decoy");
                if (!lockTarget) {
                  // Lock closest to the SAM battery
                  let minDist = Infinity;
                  targetableDrones.forEach(d => {
                    const dist = Math.sqrt(Math.pow(d.x - samPositions[idx], 2) + Math.pow(d.y - 720, 2));
                    if (dist < minDist) {
                      minDist = dist;
                      lockTarget = d;
                    }
                  });
                }

                if (lockTarget) {
                  // Fire SAM projectile towards locked drone coordinates (predicted impact)
                  const targetX = (lockTarget as Drone).x + (lockTarget as Drone).speed * (Math.random() - 0.5) * 5;
                  const targetY = (lockTarget as Drone).y;

                  stateRef.current.projectiles.push(
                    new Projectile(samPositions[idx], 720, targetX, targetY, "sam", 4.5, 40)
                  );
                  // Fire interval (SAM reload speeds increase in later waves)
                  stateRef.current.offenseSAMCooldowns[idx] = Math.max(45, 110 - wave * 10);
                }
              }
            }
          }
        }
      }

      // 8. Timers reduction
      if (stateRef.current.activeCloakTimer > 0) {
        stateRef.current.activeCloakTimer--;
        if (stateRef.current.activeCloakTimer <= 0) {
          stateRef.current.drones.forEach(d => d.isCloaked = false);
          addLog("Cloaking field exhausted. Radar signatures exposed.", "danger");
        }
      }
      if (stateRef.current.activeSpeedTimer > 0) {
        stateRef.current.activeSpeedTimer--;
        if (stateRef.current.activeSpeedTimer <= 0) {
          stateRef.current.drones.forEach(d => d.speed /= 1.6);
          addLog("Engine overdrive cooldown active. Swarm speed normal.", "system");
        }
      }

      // 9. Draw Base / City Structures
      stateRef.current.structures.forEach(s => {
        if (s.hp <= 0) {
          // Draw destroyed ruins
          ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(s.x, s.y + s.height * 0.7, s.width, s.height * 0.3);
          
          ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
          ctx.fillRect(s.x, s.y + s.height * 0.7, s.width, s.height * 0.3);
          
          ctx.fillStyle = "rgba(100, 116, 139, 0.5)";
          ctx.font = "8px 'Share Tech Mono'";
          ctx.fillText("RUIN", s.x + 10, s.y + s.height * 0.9);
          return;
        }

        // Draw wireframe building
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        
        ctx.beginPath();
        ctx.rect(s.x, s.y, s.width, s.height);
        ctx.fill();
        ctx.stroke();

        // Building accents (windows/lines)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let wx = s.x + 15; wx < s.x + s.width - 10; wx += 20) {
          for (let wy = s.y + 10; wy < s.y + s.height - 10; wy += 15) {
            ctx.rect(wx, wy, 8, 8);
          }
        }
        ctx.stroke();

        // HP bar above building
        const hpPercent = s.hp / s.maxHp;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(s.x, s.y - 12, s.width, 4);
        ctx.fillStyle = hpPercent > 0.5 ? "#10b981" : hpPercent > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(s.x, s.y - 12, s.width * hpPercent, 4);

        // Building tag
        ctx.fillStyle = s.color;
        ctx.font = "bold 9px 'Share Tech Mono'";
        ctx.fillText(s.name.toUpperCase(), s.x + 4, s.y - 18);
      });

      // 10. Draw Weapon Batteries/Turrets at bottom (Defense Side or Offense Target Indicator)
      // Left Battery (x: 150)
      ctx.save();
      ctx.strokeStyle = "#6366f1";
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(150, 755, 30, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Jammer antenna
      ctx.beginPath();
      ctx.moveTo(150, 725);
      ctx.lineTo(150, 710);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(150, 705, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#818cf8";
      ctx.fill();
      ctx.restore();

      // Center Battery / Laser Turret (x: 600)
      ctx.save();
      ctx.strokeStyle = "#06b6d4";
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(600, 755, 35, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Laser Pivot Barrel pointing up/towards mouse
      ctx.beginPath();
      ctx.moveTo(600, 755);
      ctx.lineTo(600, 715);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Right Battery / Flak Cannons (x: 1050)
      ctx.save();
      ctx.strokeStyle = "#22d3ee";
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(1050, 755, 30, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Flak Double barrels
      ctx.beginPath();
      ctx.moveTo(1040, 755);
      ctx.lineTo(1035, 720);
      ctx.moveTo(1060, 755);
      ctx.lineTo(1065, 720);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      // Ground Line
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 755);
      ctx.lineTo(1200, 755);
      ctx.stroke();

      // 11. Wave Complete Checker (Defense Mode)
      if (mode === "defense" && stateRef.current.waveActive) {
        const activeDronesCount = stateRef.current.drones.length;
        const spawnedAll = stateRef.current.waveSpawnedCount >= stateRef.current.waveTotalDrones;
        
        if (spawnedAll && activeDronesCount === 0 && stateRef.current.projectiles.length === 0) {
          stateRef.current.waveActive = false;
          // Calculate credit rewards
          const logisticsFactor = logisticsActive ? 1.0 : 0.7; // 30% reduction if compromised
          const reward = Math.round((250 + wave * 50) * logisticsFactor);
          
          setTimeout(() => {
            onWaveComplete(reward);
          }, 1500);
        }
      }

      // 12. Offense Mode: Defeat / Swarm exhaustion checker
      if (mode === "offense" && stateRef.current.waveActive) {
        const droneSquadCount = stateRef.current.drones.length;
        const lowEnergy = credits < 10; // cost of cheapest scout drone
        const commandHqDestroyed = stateRef.current.structures.find(s => s.id === "command")?.hp === 0;

        if (droneSquadCount === 0 && lowEnergy && !commandHqDestroyed && stateRef.current.projectiles.length === 0) {
          // Player ran out of drones and cannot buy any more
          stateRef.current.waveActive = false;
          setTimeout(() => {
            onGameOver(score);
          }, 2000);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(gameLoop);
    };

    // Initialize/Reset Game Loop
    stateRef.current.drones = [];
    stateRef.current.projectiles = [];
    stateRef.current.explosions = [];
    stateRef.current.debrisList = [];
    stateRef.current.laserBeam = null;
    
    // Wave spawn states reset
    stateRef.current.waveActive = true;
    stateRef.current.waveSpawnedCount = 0;
    stateRef.current.waveTotalDrones = 5 + wave * 3;
    stateRef.current.spawnInterval = Math.max(45, 120 - wave * 10);
    stateRef.current.spawnTimer = 0;
    stateRef.current.offenseSAMCooldowns = [0, 0, 0];

    // Trigger game loop
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [wave, mode, isPaused]);

  // Handle updates to weapon cooldown states
  useEffect(() => {
    if (isPaused || mode !== "defense") return;

    const cooldownInterval = setInterval(() => {
      setBatteryCooldowns(prev => {
        const flakCooldownSpeed = powerPlantActive ? 1 : 0.6; // Recharge slower if power grids down
        const empCooldownSpeed = powerPlantActive ? 1 : 0.6;

        const nextFlak = Math.max(0, prev.flak - flakCooldownSpeed);
        const nextEmp = Math.max(0, prev.emp - empCooldownSpeed);
        
        // Laser battery uses level divisor
        const laserLevel = upgrades.laserRechargeLevel;
        const laserCooldownSpeed = (powerPlantActive ? 1 : 0.6) * getUpgradeFactor(laserLevel);
        const nextLaser = Math.max(0, prev.laser - laserCooldownSpeed);

        // Auto refill Laser Ammo once cooldown hits 0
        if (prev.laser > 0 && nextLaser === 0) {
          setBatteryAmmo(a => ({ ...a, laser: 1 }));
        }

        return {
          flak: nextFlak,
          laser: nextLaser,
          emp: nextEmp
        };
      });
    }, 100);

    return () => clearInterval(cooldownInterval);
  }, [powerPlantActive, upgrades.laserRechargeLevel, mode, isPaused]);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      {/* Screen flash / damage indicator overlay */}
      {screenShake > 0 && (
        <div className="absolute inset-0 bg-red-500/5 border-2 border-red-500/20 pointer-events-none z-10" />
      )}

      {/* Target Connection Line (Offense Mode priority target line drawing) */}
      {mode === "offense" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-orange-500/30 px-3 py-1 rounded text-[10px] text-orange-400 font-bold display-font z-20 pointer-events-none uppercase">
          SWARM PRIORITY: TARGETING {targetPriority}S
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="cursor-crosshair"
      />
    </div>
  );
}
