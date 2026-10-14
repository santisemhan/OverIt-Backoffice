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
- [x] Filtros de país e idioma (Resumen, Onboarding y Usuarios; el resto de Trackeo los oculta)
- [x] Las cuentas de la comunidad (`@community.overit.invalid`) no cuentan en ninguna lista, búsqueda ni métrica; su contenido sigue en Moderación
- [x] Todas las listas paginadas
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
- [x] Cobrado (pagos de los webhooks de RevenueCat)
- [x] Quiénes son: sexo y edad
- [x] Idioma y países (mapa/ranking)
- [x] Perfil más común (respuestas del onboarding, español e inglés juntos)
- [x] Dónde se van
### Onboarding
- [x] KPIs empezaron / completaron / no completaron
- [x] Tabla de respuestas por pregunta (las de inglés suman con su par en español)
- [x] Click en una respuesta → usuarios filtrados (en los dos idiomas)
- [x] Por qué terminó: lo que escribió cada persona, con link y fecha, paginado
- [x] Embudo pantalla por pantalla, tiempos y "saltaron"
- [x] Quiénes cerraron la app en cada pantalla (con cuenta) → usuarios filtrados
### Suscripciones
- [x] Tabla de suscriptores con filtro: todas, activas, renuevan, renuevan esta semana, cancelaron (con/sin acceso), vencidas, cortesía
- [x] Ingreso mensual (MRR estimado)
- [x] Altas y cancelaciones por día
- [x] Motivos de cancelación (texto libre del feedback, no ligado a la suscripción), paginados
- [x] Primera renovación (aproximación)
### Usuarios
- [x] Listado con búsqueda, filtros, orden y paginación
- [x] Descargar CSV
- [x] Filtro de suscripción con "Activa"
- [x] Perfil: cabecera, journey, tabs Onboarding / Progreso / Recursos / Ninety / Suscripción / Comunidad
- [x] Perfil: nombre de su ex, mensaje para su yo del futuro y fecha del compromiso
- [x] Perfil: conversación con Ninety (paginada)
- [x] Perfil: sus publicaciones y comentarios con estado y fecha (paginados), con link a Moderación
- [x] Cambiar nombre visible (menú y lápiz junto al nombre)
- [x] Acceso de cortesía (dar / quitar) desde el perfil
- [x] Historial de cobros
### Uso de la app
- [x] Activos por día
- [x] Bloques: emociones, retos, lecturas, favoritos, Ninety, comunidad
- [ ] ~~Respiraciones hechas, botón de pánico, reinicios del contador, aperturas~~ — no se registran; el bloque se sacó de la pantalla por ahora

## Moderación
- [x] Comunidad: para revisar / todas / eliminadas, búsqueda, filtro por usuario
- [x] Eliminar / restaurar / "no infringe" en posts y comentarios
- [x] Comentarios dentro de cada post
- [x] Alertas automáticas (las marca la IA al publicar; "posible riesgo" va primero)
- [x] Reportes y feedback: inbox unificado, estados, filtros por tipo, acciones sobre el contenido
- [x] Endpoint `inbox/counts`
- [ ] ~~Captura adjunta en feedback~~ — no se guarda
- [x] Ninety: KPIs, uso por día, por hora (UTC), quiénes más le escriben (paginado)
- [ ] ~~Ninety: temas y largo de conversaciones~~ — no se calculan
- [x] Historial de acciones del equipo

## Fuera de alcance
- Reembolsos.
