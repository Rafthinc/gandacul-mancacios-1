"use client";
import * as Phaser from "phaser";
import { useState, useRef, useEffect } from "react";

const sizes = { width: 800, height: 600 };

class AppleGameScene extends Phaser.Scene {
  private hearts!: Phaser.GameObjects.Group;
  private lives: number = 3;
  private car!: Phaser.GameObjects.Sprite;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private foodItems!: Phaser.Physics.Arcade.Group;
  private points: number = 0;
  private textScore!: Phaser.GameObjects.Text;

  // Configurația alimentelor folosind numele fișierelor tale
  private foodTypes = [
    { key: "mar", points: 10, isHealthy: true },
    { key: "ou_fiert", points: 15, isHealthy: true },
    { key: "gogoasa", points: -20, isHealthy: false },
    { key: "burger", points: -25, isHealthy: false },
  ];

  constructor() {
    super("scene-game");
  }

  preload() {
    // Încărcăm imaginile direct din folderul public/assets
    this.load.image("bg", "/assets/bucatarie_background.png");
    this.load.image("gandac", "/assets/gandac.png");
    this.load.image("gandac_fericit", "/assets/gandac_fericit.png");
    this.load.image("gandac_bolnav", "/assets/gandac_bolnav.png");
    // Incarcam fazele masinii
    this.load.image("car_0", "/assets/car_0.png");
    this.load.image("car_1", "/assets/car_1.png");
    this.load.image("car_2", "/assets/car_2.png");
    this.load.image("car_3", "/assets/car_3.png");
    this.load.image("car_4", "/assets/car_4.png");

    // Încărcăm alimentele
    this.foodTypes.forEach((food) => {
      this.load.image(food.key, `/assets/${food.key}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;
    // Fundalul se adaptează acum la orice mărime de ecran
    this.add.image(0, 0, "bg").setOrigin(0, 0).setDisplaySize(width, height);

    // MASINA (Progresul vizual tip Turmoil)
    // O plasăm în fundal, undeva pe blatul bucătăriei
    this.car = this.add.sprite(width - 150, height - 150, "car_0");
    this.car.setAlpha(0.5); // Apare ca o "schiță" la început
    this.car.setDisplaySize(180, 100);

    // Jucătorul (Gândacul)
    this.player = this.physics.add.sprite(
      sizes.width / 2,
      sizes.height - 80,
      "gandac",
    );
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    // Ajustăm mărimea gândacului dacă e necesar
    this.player.setDisplaySize(120, 120);

    this.foodItems = this.physics.add.group();

    this.time.addEvent({
      delay: 1500,
      callback: this.spawnFood,
      callbackScope: this,
      loop: true,
    });

    this.textScore = this.add.text(10, 10, "Scor: 0", {
      font: "22px Arial Bold",
      color: "#ffffff",
      backgroundColor: "#000000",
    });

    this.physics.add.overlap(
      this.player,
      this.foodItems,
      this.collectFood,
      undefined,
      this,
    );

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Mișcare pe telefon (Touch)
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown || pointer.wasTouch) {
        this.player.x = Phaser.Math.Clamp(pointer.x, 40, sizes.width - 40);
      }
    });

    // Ascultăm evenimente de pauză din exterior
    this.events.on("pause-game", () => {
      this.physics.pause();
      this.time.paused = true;
    });

    this.events.on("resume-game", () => {
      this.physics.resume();
      this.time.paused = false;
    });
  }

  spawnFood() {
    // Luăm lățimea curentă a ecranului calculată de Phaser pentru acest dispozitiv
    const currentWidth = this.scale.width;

    // Calculăm o zonă de siguranță (padding) pentru ca alimentele să nu cadă fix pe margine
    const padding = 60;
    const x = Phaser.Math.Between(padding, currentWidth - padding);

    const type = Phaser.Utils.Array.GetRandom(this.foodTypes);
    const food = this.foodItems.create(x, -50, type.key); // Începe puțin mai sus de ecran

    food.setData("points", type.points);
    food.setData("isHealthy", type.isHealthy);

    // Setăm dimensiunea mărită pentru vizibilitate pe mobil
    food.setDisplaySize(80, 80);
  }

  collectFood(player: any, food: any) {
    const points = food.getData("points");
    const isHealthy = food.getData("isHealthy");

    this.points += points;
    if (this.points < 0) this.points = 0;
    this.textScore.setText(`Scor: ${this.points}`);

    // SCHIMBARE IMAGINE GÂNDAC
    if (!isHealthy) this.cameras.main.shake(200, 0.02);
    const textureKey = isHealthy ? "gandac_fericit" : "gandac_bolnav";
    this.player.setTexture(textureKey);

    // Revenire la imaginea normală după 0.5 secunde
    this.time.delayedCall(500, () => {
      this.player.setTexture("gandac");
    });

    food.destroy();
  }

  update() {
    if (!this.input.activePointer.isDown) {
      if (this.cursors.left.isDown) this.player.setVelocityX(-450);
      else if (this.cursors.right.isDown) this.player.setVelocityX(450);
      else this.player.setVelocityX(0);
    }

    this.foodItems.getChildren().forEach((child: any) => {
      if (child.y > sizes.height) child.destroy();
    });
  }
}

export default function AppleGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<"START" | "PLAYING" | "PAUSED">(
    "START",
  );

  useEffect(() => {
    if (gameInstance.current || gameState === "START") return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current || undefined,
      // Sincronizăm rezoluția cu fereastra browserului la start
      width: window.innerWidth,
      height: window.innerHeight,
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 300 } },
      },
      scene: AppleGameScene,
    };

    gameInstance.current = new Phaser.Game(config);

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, [gameState]);

  const handleStart = () => setGameState("PLAYING");

  const togglePause = () => {
    if (gameState === "PLAYING") {
      gameInstance.current?.scene
        .getScene("scene-game")
        .events.emit("pause-game");
      setGameState("PAUSED");
    } else {
      gameInstance.current?.scene
        .getScene("scene-game")
        .events.emit("resume-game");
      setGameState("PLAYING");
    }
  };

  const handleExit = () => {
    // În loc de Application.Quit(), redirecționăm
    window.location.href = "/dashboard";
  };

  return (
    // Folosim fixed inset-0 pentru a acoperi tot ecranul telefonului fără scroll
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden touch-none">
      {/* 1. Ecran de START (Overlay) */}
      {gameState === "START" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 text-white p-4">
          <h1 className="text-4xl md:text-6xl mb-8 font-bold text-green-400 text-center">
            apps4mind: Nutriție ADHD
          </h1>
          <button
            onClick={handleStart}
            className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-full text-2xl transition-all transform active:scale-95"
          >
            START JOC
          </button>
        </div>
      )}

      {/* 2. Containerul Jocului - Fără clase de centrare pentru a lăsa Phaser.Scale.ENVELOP să lucreze */}
      <div ref={gameContainerRef} className="w-full h-full" />

      {/* 3. Butoane de Control (HUD) - Le punem absolute peste joc */}
      {gameState !== "START" && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={togglePause}
            className="px-3 py-1 bg-white/20 hover:bg-white/40 rounded backdrop-blur-sm text-white text-sm"
          >
            {gameState === "PAUSED" ? "RESUME" : "PAUSE"}
          </button>
          <button
            onClick={handleExit}
            className="px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded backdrop-blur-sm text-white text-sm"
          >
            EXIT
          </button>
        </div>
      )}
    </div>
  );
}
