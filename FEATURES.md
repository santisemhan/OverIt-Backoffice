# Backoffice — checklist de funcionalidades

Fuente del diseño: `overitapp/new-onboarding-overit` → `/backoffice` (guía `BACKOFFICE.md`).
Backend: branch `feat/backoffice` de `OverIt-Backend` (endpoints en `docs/API.md`).
Leyenda: `[x]` hecho · `[ ]` pendiente · `~~tachado~~` TODO(difícil): no se hace por ahora, con el motivo.

## Base
- [x] Login de admin (`POST api/dashboard/auth/admin/login`, rol `Admin`)
- [x] Sesión con expiración y logout
- [x] Shell: rail violeta + panel de áreas, drawer en mobile, tabs por área
- [x] Búsqueda rápida ⌘K (usuarios y secciones)
- [x] Filtro global de período en Trackeo
- [ ] ~~Filtros de país e idioma~~ — el backend no guarda país ni idioma del usuario (requiere que mobile los envíe)
- [x] Toasts con deshacer, modales de confirmación, skeletons, estados vacíos
- [x] Policy `Backoffice.Admin` en backend + CORS para el origen del backoffice
- [x] Historial (auditoría) de cada acción del equipo
- [ ] Alta de admins desde el backoffice (hoy se crean en la base)
- [ ] Roles además de Admin (punto de extensión en `BackofficeAuthorization`)

## Trackeo
### Resumen
- [x] Camino de conversión (registros → paywall → suscriptos → con acceso)
- [ ] ~~"Descargas" reales~~ — no hay evento de instalación; se usan registros
- [x] Evolución por día/semana
- [x] Ingresos: MRR estimado y suscripciones activas (requiere cargar `Backoffice:ProductMonthlyPrices`)
- [ ] ~~Cobrado (ingresos reales)~~ — el espejo de RevenueCat no guarda pagos
- [x] Quiénes son: sexo y edad
- [ ] ~~Idioma y países (mapa/ranking)~~ — no se guardan
- [x] Perfil más común (respuestas del onboarding)
- [ ] ~~Dónde se van~~ — mobile no envía eventos por pantalla
### Onboarding
- [x] KPIs empezaron / completaron / no completaron
- [x] Distribución de respuestas por pregunta
- [ ] Click en una respuesta → usuarios filtrados (falta filtro por respuesta en `GET users`; fácil)
- [ ] ~~Embudo pantalla por pantalla, tiempos y "saltaron"~~ — mobile no envía eventos por pantalla
### Suscripciones
- [x] Listas: renuevan, renuevan esta semana, cancelaron (con/sin acceso), vencidas, cortesía
- [x] Ingreso mensual (MRR estimado)
- [x] Altas y cancelaciones por día
- [x] Motivos de cancelación (texto libre del feedback, no ligado a la suscripción)
- [x] Primera renovación (aproximación)
### Usuarios
- [x] Listado con búsqueda, filtros, orden y paginación
- [x] Descargar CSV
- [x] Perfil: cabecera, journey, tabs Onboarding / Progreso / Recursos / Ninety / Suscripción / Comunidad
- [x] Cambiar nombre visible
- [x] Acceso de cortesía (dar / quitar) desde el perfil
- [ ] ~~Historial de cobros~~ — no se guardan pagos
### Uso de la app
- [x] Activos por día
- [x] Bloques: emociones, retos, lecturas, favoritos, Ninety, comunidad
- [ ] ~~Respiraciones hechas, botón de pánico, reinicios del contador, aperturas~~ — no se registran

## Moderación
- [x] Comunidad: para revisar / todas / eliminadas, búsqueda, filtro por usuario
- [x] Eliminar / restaurar / "no infringe" en posts y comentarios
- [ ] Comentarios dentro de cada post (falta filtro `postId` en `moderation/comments`; fácil)
- [ ] ~~Alertas automáticas (posible riesgo, teléfono, links, venta)~~ — requiere clasificador en backend
- [x] Reportes y feedback: inbox unificado, estados, filtros por tipo, acciones sobre el contenido
- [ ] Endpoint `inbox/counts` (hoy los contadores hacen varias requests; optimización)
- [ ] ~~Captura adjunta en feedback~~ — no se guarda
- [x] Ninety: KPIs, uso por día, por hora (UTC), top usuarios
- [ ] ~~Ninety: temas y largo de conversaciones~~ — no se calculan
- [x] Historial de acciones del equipo

## Contenido
- [x] Retos diarios: CRUD, borradores, reordenar días, mover, duplicar, editor con preview
- [ ] ~~% que completa cada reto~~ — no hay estadística por reto
- [x] Respiraciones: CRUD (pasos inhala / sostén / exhala)
- [x] Artículos & Tips: CRUD con editor de bloques
- [x] Frases: CRUD
- [x] Datos científicos: CRUD
- [x] Selector de idioma (es / en)
- [x] Endpoints de contenido sólo para admin (se quitaron create/delete de la policy `Premium` mobile)
- [ ] Rotación diaria de frases/datos en el orden de la lista (hoy la app elige al azar)

## Fuera de alcance
- Reembolsos.
