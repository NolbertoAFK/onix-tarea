import { useState } from 'react'
import { supabase } from '../config/supabaseClient'

export default function Login({ onLoginSuccess }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Autenticar al usuario en el sistema de Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: password,
      })

      if (authError) throw new Error('Credenciales incorrectas o usuario no encontrado.')

      const user = authData.user

      // 2. Consultar el perfil del usuario para verificar su Rol y si tiene Sesión Activa
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol_id, session_id, nombre')
        .eq('id', user.id)
        .single()

      if (perfilError || !perfil) throw new Error('No se pudo encontrar el perfil de este usuario.')

      // --- EXAMEN: CONTROL DE SESIÓN ÚNICA ---
      // Generamos un identificador único para este navegador/pestaña actual
      const localToken = crypto.randomUUID()

      // Si ya existe una sesión guardada en la base de datos
      if (perfil.session_id) {
        setError('¡Acceso Denegado! Existe una sesión activa previa en otro navegador.')
        // Forzamos el cierre de sesión en el auth para mantener la seguridad informática
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 3. Si la sesión estaba libre, guardamos nuestro token local en la BD de Supabase
      await supabase
        .from('perfiles')
        .update({ session_id: localToken })
        .eq('id', user.id)

      // Guardamos el token local en el almacenamiento del navegador actual para las verificaciones en tiempo real
      localStorage.setItem('my_session_token', localToken)

      // Pasamos los datos del usuario logueado exitosamente al enrutador central
      onLoginSuccess({
        id: user.id,
        nombre: perfil.nombre,
        rol: perfil.rol_id
      })

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Flujo básico de Google OAuth (Requisito del Entregable)
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // Redirige automáticamente a la URL actual en vivo
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">Sistema de Solicitudes</h2>
          <p className="text-gray-400 text-sm">Ingresa para gestionar tus permisos</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-xs font-semibold mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-600 text-xs font-semibold mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2.5 rounded-lg transition"
          >
            {loading ? 'Validando seguridad...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <hr className="border-gray-200" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-400">O</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold p-2.5 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 15 1 12 1 7.35 1 3.4 3.65 1.45 7.5l3.85 3C6.25 7.6 8.87 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.5 12.25c0-.82-.07-1.6-.2-2.35H12v4.45h6.45c-.27 1.44-1.08 2.66-2.3 3.48l3.55 2.75c2.1-1.94 3.3-4.8 3.3-8.33z"/>
            <path fill="#FBBC05" d="M5.3 14.5c-.25-.75-.4-1.55-.4-2.4s.15-1.65.4-2.4L1.45 6.7C.53 8.55 0 10.2 0 12s.53 3.45 1.45 5.3l3.85-2.8z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.55-2.75c-1 .67-2.28 1.07-4.41 1.07-3.13 0-5.75-2.56-6.7-5.46l-3.85 3C3.4 20.35 7.35 23 12 23z"/>
          </svg>
          Ingresar con Google
        </button>
      </div>
    </div>
  )
}