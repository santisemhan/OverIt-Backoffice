# Backoffice — checklist de funcionalidades

Fuente del diseño: `overitapp/new-onboarding-overit` → `/backoffice` (guía `BACKOFFICE.md`).
Leyenda: `[x]` hecho · `[ ]` pendiente · `TODO(difícil)` no se hace por ahora, con el motivo.

## Base
- [x] Login de admin (`POST api/dashboard/auth/admin/login`, rol `Admin`)
- [x] Sesión con expiración y logout
- [x] Shell: rail violeta + panel de áreas, drawer en mobile, tabs por área
- [ ] Búsqueda rápida ⌘K (usuarios y secciones) — secciones hechas; usuarios pendiente (`usePaletteUsers`)
- [x] Filtros globales de Trackeo (período, país, idioma)
- [x] Toasts, modales de confirmación, skeletons, estados vacíos
- [ ] Policy `Backoffice.Admin` en backend + CORS para el origen del backoffice
- [ ] Historial (auditoría) de cada acción del equipo

## Trackeo
### Resumen
- [ ] Camino de conversión (descargas → paywall → suscriptos → con acceso)
- [ ] Evolución por día/semana (descargas, paywall, pagó, conversión)
- [ ] Ingresos: MRR estimado y suscripciones activas
- [ ] Quiénes son: sexo, edad, idioma
- [ ] Países: ranking (+ mapa)
- [ ] Perfil más común (respuestas del onboarding)
- [ ] Dónde se van (pantallas con más abandono) — depende de tracking por pantalla
### Onboarding
- [ ] KPIs empezaron / completaron / no completaron
- [ ] Distribución de respuestas por pregunta (click → usuarios filtrados)
- [ ] Embudo pantalla por pantalla, tiempos y "saltaron" — TODO(difícil) si mobile no registra pasos
### Suscripciones
- [ ] Listas: renuevan, renuevan esta semana, cancelaron, vencidas
- [ ] Ingreso mensual (MRR)
- [ ] Altas y cancelaciones por día
- [ ] Motivos de cancelación
- [ ] Primera renovación (renovaron vs no)
### Usuarios
- [ ] Listado con búsqueda, filtros (onboarding, suscripción), orden y paginación
- [ ] Descargar CSV
- [ ] Perfil: cabecera, journey, tabs Onboarding / Progreso / Recursos / Ninety / Suscripción / Comunidad
- [ ] Cambiar nombre visible
- [ ] Acceso de cortesía (subscription grants) desde el perfil
### Uso de la app
- [ ] Activos por día
- [ ] Bloques por feature (respiraciones, artículos, retos, emociones, pánico, reinicios, Ninety, comunidad)

## Moderación
- [ ] Comunidad: para revisar / todas / eliminadas, búsqueda, filtro por usuario
- [ ] Eliminar / restaurar / "no infringe" en posts y comentarios
- [ ] Alertas automáticas (flags)
- [ ] Reportes y feedback: inbox unificado, estados nuevo / en revisión / resuelto, filtros por tipo
- [ ] Ninety: KPIs, uso por día, por hora, top usuarios
- [ ] Historial de acciones del equipo

## Contenido
- [ ] Retos diarios: CRUD, borradores, reordenar días
- [ ] Respiraciones: CRUD
- [ ] Artículos & Tips: CRUD con bloques
- [ ] Frases: CRUD
- [ ] Datos científicos: CRUD
- [ ] Endpoints de contenido protegidos por rol admin (hoy create/delete están bajo la policy `Premium` mobile)

## Fuera de alcance / TODO(difícil)
- Reembolsos — explícitamente fuera de alcance.
