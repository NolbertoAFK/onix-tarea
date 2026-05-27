import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function PanelEmpleado({ usuario, onLogout }) {
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarSolicitudes()
  }, [])

  const cargarSolicitudes = async () => {
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('fecha_creacion', { ascending: false })
    if (data) setSolicitudes(data)
  }

  const handleCrearSolicitud = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!motivo || !fecha) return

    const { error } = await supabase
      .from('solicitudes')
      .insert([{ usuario_id: usuario.id, motivo, fecha_solicitud: fecha }])

    if (!error) {
      setMensaje('Solicitud enviada correctamente.')
      setMotivo('')
      setFecha('')
      cargarSolicitudes()
    } else {
      setMensaje('Error al procesar la solicitud.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-lg">Portal de Empleado</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">Bienvenido, <strong className="text-white">{usuario.nombre}</strong></span>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">Cerrar Sesión</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Formulario */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-700 text-lg mb-4">Nueva Solicitud</h3>
          {mensaje && <div className="p-3 text-sm rounded-lg bg-blue-50 text-blue-700 mb-3 font-medium">{mensaje}</div>}
          <form onSubmit={handleCrearSolicitud} className="space-y-4">
            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1">Fecha Requerida</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1">Motivo</label>
              <textarea required rows="3" className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" placeholder="Detalle su motivo..." value={motivo} onChange={(e) => setMotivo(e.target.value)}></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 transition">Enviar Permiso</button>
          </form>
        </div>

        {/* Historial */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 text-lg mb-4">Mis Solicitudes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-3">Fecha Solicitada</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.length > 0 ? solicitudes.map(sol => (
                  <tr key={sol.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium whitespace-nowrap">{sol.fecha_solicitud}</td>
                    <td className="p-3">{sol.motivo}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sol.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' : sol.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{sol.estado}</span>
                    </td>
                  </tr>
                )) : <tr><td colSpan="3" className="p-4 text-center text-gray-400">No has registrado solicitudes.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}