import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'
import { auth } from '../services/firebase'
import type { AuthState } from '../types'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setState({
          user: {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || undefined,
          },
          loading: false,
          error: null,
        })
      } else {
        setState({ user: null, loading: false, error: null })
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: getErrorMessage(error.code) }))
      throw error
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, login, logout }
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos'
    case 'auth/user-not-found':
      return 'Usuario no encontrado'
    case 'auth/wrong-password':
      return 'Contraseña incorrecta'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde'
    default:
      return 'Error de autenticación'
  }
}