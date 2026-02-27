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
    this.load.image("inima", "/assets/inima.png");

    this.load.audio("muzica_bg", "/assets/sunete/muzica_fundal.mp3");
    this.load.audio("sunet_fail", "/assets/sunete/pierde_viata.mp3");
    this.load.audio("car_construction", "/assets/sunete/car_construction.mp3");
    this.load.audio("game_over", "/assets/sunete/Game End.mp3");
    this.load.audio("move_car", "/assets/sunete/move_car.ogg");
    this.load.audio("yaay", "/assets/sunete/yaay.mp3");

    // Încărcăm alimentele
    this.foodTypes.forEach((food) => {
      this.load.image(food.key, `/assets/${food.key}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;
    // Fundalul se adaptează acum la orice mărime de ecran
    this.add.image(0, 0, "bg").setOrigin(0, 0).setDisplaySize(width, height);

    // Adăugăm sunetul în scenă
    const bgMusic = this.sound.add("muzica_bg", {
      volume: 0.5,
      loop: true,
    });

    // Pornim muzica
    // NOTĂ: Browserele moderne cer un click/interacțiune înainte de a lăsa sunetul să pornească
    bgMusic.play();

    // 1. Creăm un fundal circular pentru mașină (UI Background)
    const circleUI = this.add.graphics();
    circleUI.fillStyle(0xffffff, 0.8); // Alb semi-transparent
    circleUI.fillCircle(100, 100, 70); // Poziție (100, 100) cu rază de 70
    circleUI.lineStyle(4, 0x00ff00, 1); // Bordură verde pentru ADHD focus
    circleUI.strokeCircle(100, 100, 70);

    // MASINA (Progresul vizual tip Turmoil)
    // O plasăm în fundal, undeva pe blatul bucătăriei
    this.car = this.add.sprite(100, 100, "car_0");
    this.car.setAlpha(0.7); // Apare ca o "schiță" la început
    this.car.setDisplaySize(180, 100);

    // INIMI (Sistemul de vieți)
    this.hearts = this.add.group();
    // Buclele for trebuie să fie obligatoriu în interiorul create()
    for (let i = 0; i < 3; i++) {
      const x = width - 40 - i * 45;
      const heart = this.add.sprite(x, 40, "inima").setDisplaySize(65, 65);
      this.hearts.add(heart);
    }

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

    if (isHealthy) {
      this.points += points;
      this.updateCarProgress();
    } else {
      this.loseLife();
      this.cameras.main.shake(200, 0.02); // Feedback vizual
    }

    // SCHIMBARE IMAGINE GÂNDAC
    const textureKey = isHealthy ? "gandac_fericit" : "gandac_bolnav";
    this.player.setTexture(textureKey);

    // Revenire la imaginea normală după 0.5 secunde
    this.time.delayedCall(500, () => {
      this.player.setTexture("gandac");
    });

    food.destroy();
  }

  loseLife() {
    this.lives--;
    this.sound.play("sunet_fail");
    const heartArray = this.hearts.getChildren() as Phaser.GameObjects.Sprite[];
    if (heartArray[this.lives]) {
      heartArray[this.lives].setTint(0x333333); // Inima devine gri
      heartArray[this.lives].setAlpha(0.5);
    }

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  updateCarProgress() {
    let changed = false;

    // Verificăm pragurile de la cel mai mare la cel mai mic
    // și adăugăm verificarea texturii actuale pentru a evita redundanța
    if (this.points >= 200 && this.car.texture.key !== "car_4") {
      this.car.setTexture("car_4");
      this.car.setAlpha(1);
      changed = true;
      this.levelComplete();
    } else if (
      this.points >= 150 &&
      this.points < 200 &&
      this.car.texture.key !== "car_3"
    ) {
      this.car.setTexture("car_3");
      this.car.setAlpha(0.9);
      changed = true;
    } else if (
      this.points >= 100 &&
      this.points < 150 &&
      this.car.texture.key !== "car_2"
    ) {
      this.car.setTexture("car_2");
      this.car.setAlpha(0.8);
      changed = true;
    } else if (
      this.points >= 60 &&
      this.points < 100 &&
      this.car.texture.key !== "car_1"
    ) {
      this.car.setTexture("car_1");
      this.car.setAlpha(0.7);
      changed = true;
    }

    // Dacă s-a schimbat faza, activăm efectele vizuale
    if (changed) {
      // 1. Pulsare (Scale Up/Down)
      this.sound.play("car_construction");
      this.tweens.add({
        targets: this.car,
        scale: { from: 0.1, to: 0.3 }, // Ajustează valorile în funcție de displaySize
        duration: 300,
        yoyo: true,
        ease: "Back.easeOut",
      });

      // 2. Mic cutremur local (Shake) pentru atenție
      this.tweens.add({
        targets: this.car,
        x: "+=5",
        y: "+=5",
        duration: 50,
        repeat: 5,
        yoyo: true,
      });
    }
  }

  levelComplete() {
    // 1. Oprim fizica pentru a nu mai cădea alimente în timpul animației de final
    this.physics.pause();
    this.time.removeAllEvents();
    this.sound.play("yaay");
    this.sound.play("move_car");

    // 2. Facem flip pe axa X (Oglindire)
    // Presupunem că mașina ta privește spre stânga implicit.
    // Dacă privește spre dreapta, pune false.
    this.car.setFlipX(true);

    // 3. Animația de plecare
    // Putem adăuga un mic efect de "pregătire" (stretch) înainte de start
    this.tweens.add({
      targets: this.car,
      scaleX: 0.4, // Se lungește puțin
      duration: 200,
      yoyo: true,
      onComplete: () => {
        // Plecarea propriu-zisă spre marginea ecranului
        this.tweens.add({
          targets: this.car,
          x: this.scale.width + 300, // Iese din ecran prin dreapta
          duration: 2000,
          ease: "Power2.easeIn",
          onComplete: () => {
            // Aici poți apela ecranul de succes sau următorul nivel
            console.log("Nivel finalizat!");
          },
        });

        // Gândacul urcă și el (sau dispare în mașină)
        this.tweens.add({
          targets: this.player,
          x: this.scale.width + 300,
          alpha: 0,
          duration: 2000,
          ease: "Power2.easeIn",
        });
      },
    });
  }

  gameOver() {
    // 1. Oprim fizica și evenimentele de generare a alimentelor
    this.physics.pause();
    this.time.removeAllEvents();

    // 2. Schimbăm imaginea gândacului în cea de "bolnav" pentru feedback vizual
    this.player.setTexture("gandac_bolnav");
    this.player.setTint(0xff0000); // Îl facem roșiatic pentru accentuarea eșecului

    // 3. Adăugăm un text mare de Game Over în mijlocul ecranului
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 50, "GAME OVER", {
        font: "bold 60px Arial",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, `Scor final: ${this.points}`, {
        font: "30px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // 4. Instrucțiune pentru restart (simplu deocamdată)
    const restartText = this.add
      .text(width / 2, height / 2 + 80, "Apasă pentru Restart", {
        font: "20px Arial",
        color: "#00ff00",
      })
      .setOrigin(0.5);

    // Facem ecranul interactiv pentru a reporni jocul
    this.input.once("pointerdown", () => {
      // Oprește absolut toate sunetele care rulează în acest moment (muzică fundal + efecte)
      this.sound.stopAll();
      this.scene.restart();
      this.points = 0; // Resetăm punctele manual dacă e nevoie
    });
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
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center">
          {/* Titlul cu spațiere generoasă jos (mb-12) */}
          <h1 className="text-5xl md:text-7xl mb-12 font-extrabold tracking-tight text-green-400 drop-shadow-lg">
            apps4mind: Nutriție ADHD
          </h1>

          {/* Butonul stilizat cu efecte de hover și shadow */}
          <button
            onClick={handleStart}
            className="px-16 py-6 min-w-70 bg-green-600 hover:bg-green-500 
    rounded-full text-3xl font-bold text-white
    transition-all duration-300 transform 
    hover:scale-105 active:scale-95
    shadow-xl hover:shadow-green-500/50
  "
          >
            START JOC
          </button>

          <p className="mt-8 text-slate-400 text-lg animate-pulse">
            Atinge butonul pentru a începe construcția mașinii
          </p>
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
