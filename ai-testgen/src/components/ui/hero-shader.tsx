import { MeshGradient } from '@paper-design/shaders-react'
import type { ReactNode } from 'react'

export function HeroShader({ children }: { children?: ReactNode }) {
  return (
    <div className="relative w-full h-[600px] sm:h-[800px] overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <MeshGradient
          colors={['#8b5cf6', '#6d28d9', '#4c1d95', '#1e1b4b']}
          speed={0.2}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
