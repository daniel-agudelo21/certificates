import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Lock, Mail, User } from 'lucide-react'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-sage-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-50 px-4">
        <div className="w-full max-w-md card-elevated p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sage-100 text-sage-600 mb-4 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-heading-lg font-display font-semibold text-base-900">Certificados IA</h1>
            <p className="text-body-sm text-base-500 mt-1">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              await login(email, password)
            } catch {
              setError('Credenciales inválidas')
            }
          }} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="tu@empresa.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              <User className="w-5 h-5 mr-2" />
              Iniciar sesión
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-base-500">
            Solo para personal autorizado
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}