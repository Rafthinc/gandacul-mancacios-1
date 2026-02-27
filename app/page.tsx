"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("./components/PhaserGame"), {
  ssr: false,
});

const AppleGame = dynamic(() => import("./components/AppleGame"), {
  ssr: false,
});

export default function Home() {
  return (
    <div>
      {/* <h1>Hello World</h1> */}
      {/* <PhaserGame /> */}
      <AppleGame />
    </div>
  );
}
