'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Cpu, Lock, Terminal } from 'lucide-react'

interface FuturisticLoaderProps {
  message?: string
}

export function FuturisticLoader({ message }: FuturisticLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [dots, setDots] = useState('')

  const steps = [
    'ESTABELECENDO CONEXÃO DE REDE SEGURA...',
    'AUTENTICANDO CREDENCIAIS DE ACESSO...',
    'CARREGANDO MÓDULOS DO DEPARTAMENTO...',
    'SINCRO-CHAVE DE CRIPTOGRAFIA ATIVADA...',
    'PERMISSÃO DE ACESSO CONCEDIDA. BEM-VINDO!',
  ]

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 450)

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 200)

    return () => {
      clearInterval(stepInterval)
      clearInterval(dotInterval)
    }
  }, [steps.length])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e]/95 backdrop-blur-md">
      {/* Background Tech Grids and Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="absolute -inset-[10%] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Radar Circular rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-primary/10 animate-[ping_4s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-primary/20 animate-[pulse_3s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full border border-primary/30" />
      </div>

      {/* Futuristic Mainframe Card */}
      <div className="relative w-full max-w-md p-8 rounded-2xl border border-primary/20 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col items-center">
        {/* Corner Decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

        {/* Central Pulsing Hologram Logo */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-8">
          {/* Rotating outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
          />
          {/* Reverse rotating second ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute -inset-2 rounded-full border border-dashed border-primary/20"
          />
          
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Shield className="h-8 w-8 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4 animate-bounce" /> SYSTEM BOOT {dots}
        </h2>
        <p className="text-xs text-muted-foreground font-mono mb-6">NÔMADE v3.5 - ASSISTENTE VIRTUAL OPERACIONAL</p>

        {/* Tactical status lines */}
        <div className="w-full bg-black/40 rounded-lg p-4 border border-white/5 font-mono text-[11px] text-primary/80 leading-relaxed text-left min-h-[90px] flex flex-col justify-end space-y-1 select-none">
          <div className="text-white/40 flex items-center gap-1.5 border-b border-white/5 pb-1 mb-1">
            <Cpu className="h-3 w-3 text-primary animate-pulse" />
            <span>TERMINAL LOG: SECURE_INITIALIZE</span>
          </div>
          
          <AnimatePresence mode="popLayout">
            {steps.slice(0, currentStep + 1).map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={idx === currentStep ? "text-primary font-bold flex items-center gap-1" : "text-primary/40 flex items-center gap-1"}
              >
                <span className="text-primary/60">{`[0${idx + 1}]`}</span>
                <span className="truncate">{step}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Holographic Glowing Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-6 border border-white/5">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
            className="bg-gradient-to-r from-primary via-blue-400 to-primary h-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>AUTENTICAÇÃO PROTOCOLO SSL-256</span>
        </div>
      </div>
    </div>
  )
}
