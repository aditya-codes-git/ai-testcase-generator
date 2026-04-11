import type { ReactNode } from 'react'
import Beams from './Beams'

export function HeroShader({ children }: { children?: ReactNode }) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Beams Background */}
      <div className="absolute inset-0 z-0">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
