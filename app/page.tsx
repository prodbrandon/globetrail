"use client"

import { useState } from "react"
import RotatingEarth from "@/components/rotating-earth"
import ReactGlobeEarth from "@/components/react-globe-earth"
import ChatbotSection from "@/components/chatbot-section"

export default function Home() {
  const [useReactGlobe, setUseReactGlobe] = useState(true)

  return (
    <main className="h-screen bg-black flex overflow-hidden">
      <div className="w-3/5 h-full flex justify-center items-center relative bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div
            className="absolute top-[25%] right-[20%] w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-[60%] left-[10%] w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute top-[80%] right-[30%] w-1 h-1 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute top-[40%] right-[10%] w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>
          <div
            className="absolute top-[15%] left-[40%] w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "3s" }}
          ></div>
        </div>
        
        {/* Globe Toggle */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setUseReactGlobe(!useReactGlobe)}
            className="px-3 py-2 text-sm rounded-md bg-white/10 text-white backdrop-blur hover:bg-white/20 transition-colors border border-white/20"
          >
            {useReactGlobe ? "Switch to D3 Globe" : "Switch to React Globe"}
          </button>
        </div>

        {/* Globe Components */}
        {useReactGlobe ? (
          <ReactGlobeEarth className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <RotatingEarth width={600} height={450} />
          </div>
        )}
      </div>

      <div className="w-2/5 h-full flex flex-col">
        <ChatbotSection />
      </div>
    </main>
  )
}
