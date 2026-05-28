'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

type Empresa = 'NOVARSO' | 'IDQ4' | 'TODAS'

interface EmpresaCtx { empresa: Empresa; setEmpresa: (e: Empresa) => void }

const Ctx = createContext<EmpresaCtx>({ empresa: 'TODAS', setEmpresa: () => {} })

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa>('TODAS')
  return <Ctx.Provider value={{ empresa, setEmpresa }}>{children}</Ctx.Provider>
}

export const useEmpresa = () => useContext(Ctx)
