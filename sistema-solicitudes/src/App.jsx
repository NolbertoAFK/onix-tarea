import { useState, useEffect } from 'react'
import { supabase } from './config/supabaseClient'
import Login from './components/Login'
import PanelEmpleado from './components/PanelEmpleado'
import PanelAdmin from './components/PanelAdmin'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Validar si hay una sesión activa de Supabase guardada en el navegador al recargar
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol_id, session_id, nombre')
          .eq('id', session.user.id)
          .single()

        const localToken = localStorage.getItem('my_session_token')

        // Si el token del navegador NO coincide con el de Supabase, limpiamos y expulsamos
        if (perfil && perfil.session_id === localToken) {
          setUsuario({ id: session.user.id, nombre: perfil.nombre, rol: perfil.rol_id })
        } else {
          handleLogoutDirecto(session.user.id)
        }
      }
      setChecking(false)
    }

    checkUser()
  }, [])

  const handleLogoutDirecto = async (userId) => {
    if (userId) {
      await supabase.from('perfiles').update({ session_id: null }).eq('id', userId)
    }
    await supabase.auth.signOut()
    localStorage.removeItem('my_session_token')
    setUsuario(null)
  }

  const handleLogout = () => {
    if (usuario) handleLogoutDirecto(usuario.id)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 font-semibold animate-pulse">Cargando módulos de seguridad...</p>
      </div>
    )
  }

  if (!usuario) {
    return <Login onLoginSuccess={(user) => setUsuario(user)} />
  }

  return usuario.rol === 1 ? (
    <PanelAdmin usuario={usuario} onLogout={handleLogout} />
  ) : (
    <PanelEmpleado usuario={usuario} onLogout={handleLogout} />
  )
}