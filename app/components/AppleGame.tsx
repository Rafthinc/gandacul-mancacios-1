"use client";
import * as Phaser from "phaser";
import { useState, useRef, useEffect } from "react";

const sizes = { width: 800, height: 600 };

class AppleGameScene extends Phaser.Scene {
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

    // Încărcăm alimentele
    this.foodTypes.forEach((food) => {
      this.load.image(food.key, `/assets/${food.key}.png`);
    });
  }

  create() {
    this.add
      .image(0, 0, "bg")
      .setOrigin(0, 0)
      .setDisplaySize(sizes.width, sizes.height);

    // Jucătorul (Gândacul)
    this.player = this.physics.add.sprite(
      sizes.width / 2,
      sizes.height - 60,
      "gandac",
    );
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    // Ajustăm mărimea gândacului dacă e necesar
    this.player.setDisplaySize(180, 80);

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
    const x = Phaser.Math.Between(40, sizes.width - 40);
    const type = Phaser.Utils.Array.GetRandom(this.foodTypes);

    const food = this.foodItems.create(x, 0, type.key);
    food.setData("points", type.points);
    food.setData("isHealthy", type.isHealthy);
    food.setDisplaySize(60, 60);
  }

  collectFood(player: any, food: any) {
    const points = food.getData("points");
    const isHealthy = food.getData("isHealthy");

    this.points += points;
    if (this.points < 0) this.points = 0;
    this.textScore.setText(`Scor: ${this.points}`);

    // SCHIMBARE IMAGINE GÂNDAC
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
      width: sizes.width,
      height: sizes.height,
      scale: {
        mode: Phaser.Scale.FIT, // Cuprinde ecranul
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 300 } } },
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
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* 1. Ecran de START (Overlay) */}
      {gameState === "START" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 text-white">
          <h1 className="text-4xl mb-8 font-bold text-green-400">
            apps4mind: Nutriție ADHD
          </h1>
          <button
            onClick={handleStart}
            className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-full text-2xl transition-all transform hover:scale-110"
          >
            START JOC
          </button>
        </div>
      )}

      {/* 2. Containerul Jocului Phaser */}
      <div ref={gameContainerRef} className="w-full h-full" />

      {/* 3. Butoane de Control (HUD) */}
      {gameState !== "START" && (
        <div className="absolute top-4 right-4 z-10 flex gap-4">
          <button
            onClick={togglePause}
            className="p-2 bg-white/20 hover:bg-white/40 rounded backdrop-blur-md text-white min-w-[80px]"
          >
            {gameState === "PAUSED" ? "RESUME" : "PAUSE"}
          </button>
          <button
            onClick={handleExit}
            className="p-2 bg-red-600/50 hover:bg-red-600 rounded backdrop-blur-md text-white"
          >
            EXIT
          </button>
        </div>
      )}
    </div>
  );
}
