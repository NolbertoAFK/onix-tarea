import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function PanelAdmin({ usuario, onLogout }) {
  const [solicitudes, setSolicitudes] = useState([])

  useEffect(() => {
    cargarTodasSolicitudes()
  }, [])

  const cargarTodasSolicitudes = async () => {
    // Consulta relacional nativa de Supabase para traer el nombre del empleado
    const { data } = await supabase
      .from('solicitudes')
      .select('*, perfiles(nombre)')
      .order('fecha_creacion', { ascending: false })
    if (data) setSolicitudes(data)
  }

  const handleResolver = async (id, nuevoEstado) => {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (!error) cargarTodasSolicitudes()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-lg">Panel de Administración</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">Admin: <strong>{usuario.nombre}</strong></span>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">Cerrar Sesión</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 text-xl mb-4">Evaluación de Permisos del Personal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-800 text-white text-xs uppercase">
                <tr>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Fecha Requerida</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.length > 0 ? solicitudes.map(sol => (
                  <tr key={sol.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">{sol.perfiles?.nombre || 'Desconocido'}</td>
                    <td className="p-3 whitespace-nowrap">{sol.fecha_solicitud}</td>
                    <td className="p-3">{sol.motivo}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sol.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' : sol.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{sol.estado}</span>
                    </td>
                    <td className="p-3 text-center">
                      {sol.estado === 'Pendiente' ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleResolver(sol.id, 'Aprobado')} className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded font-medium transition">Aprobar</button>
                          <button onClick={() => handleResolver(sol.id, 'Rechazado')} className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-medium transition">Rechazar</button>
                        </div>
                      ) : <span className="text-gray-400 text-xs italic">Evaluada</span>}
                    </td>
                  </tr>
                )) : <tr><td colSpan="5" className="p-4 text-center text-gray-400">No hay solicitudes por evaluar.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}