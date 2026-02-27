"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function initGame() {
      if (
        typeof window !== "undefined" &&
        containerRef.current &&
        !gameRef.current
      ) {
        const Phaser = (await import("phaser")).default;

        if (!isMounted) return;

        const config = {
          type: Phaser.AUTO,
          width: 800,
          height: 400,
          parent: containerRef.current,
          physics: {
            default: "arcade",
            arcade: {
              gravity: { y: 200, x: 0 },
            },
          },
          scene: {
            preload: function (this: any) {
              this.load.setBaseURL("https://labs.phaser.io");
              this.load.image("sky", "assets/skies/space3.png");
              this.load.image("logo", "assets/sprites/phaser3-logo.png");
              this.load.image("red", "assets/particles/red.png");
            },
            create: function (this: any) {
              this.add.image(400, 300, "sky");

              const particles = this.add.particles(0, 0, "red", {
                speed: 100,
                scale: { start: 1, end: 0 },
                blendMode: "ADD",
              });

              const logo = this.physics.add.image(400, 100, "logo");

              logo.setVelocity(100, 200);
              logo.setBounce(1, 1);
              logo.setCollideWorldBounds(true);

              particles.startFollow(logo);
            },
          },
        };

        gameRef.current = new Phaser.Game(config);
      }
    }

    initGame();

    return () => {
      isMounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
