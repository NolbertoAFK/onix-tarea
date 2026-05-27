export type RoleName = "admin" | "usuario";
export type VacationStatus = "pendiente" | "aprobado" | "rechazado";

export type Profile = {
  id: string;
  nombre: string;
  rol_id: number;
  roles?:
    | {
        nombre: RoleName;
      }
    | {
        nombre: RoleName;
      }[]
    | null;
};

export type AdminProfile = {
  id: string;
  email: string | null;
  nombre: string;
  rol_id: number;
  rol_nombre: RoleName;
  active_session_started_at: string | null;
  has_active_session: boolean;
  created_at: string;
};

export type VacationRequest = {
  id: number;
  usuario_id: string;
  usuario_nombre?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  motivo: string;
  estado: VacationStatus;
  comentario_admin: string | null;
  autorizado_por: string | null;
  autorizado_por_nombre?: string | null;
  fecha_respuesta: string | null;
  created_at: string;
  perfiles?:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
};
