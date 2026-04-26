# MitiMiti

Mini app para dividir gastos entre amigos. Primera versión solo front-end, estado en memoria y arquitectura lista para conectar un backend luego.

## Stack
- Vite + React + TypeScript
- Tailwind CSS + design tokens (`src/shared/design-system/design-system.json`)
- Zustand para estado global
- ESLint + Prettier
- Vitest + Testing Library (jsdom)

## Scripts
- `npm install` - instala dependencias.
- `npm run dev` - servidor de desarrollo Vite.
- `npm run lint` - ESLint.
- `npm run test` - Vitest en CLI.
- `npm run build` - build de producción (incluye chequeo de tipos).
- `npm run preview` - sirve el build localmente.

## Estructura de carpetas (principales)
```
src/
  app/                       # providers/router
  application/               # casos de uso y puertos
    dto/                     # DTOs de entrada
    ports/                   # interfaces de repositorio
    use-cases/               # orquestación de dominio
  domain/                    # modelos y servicios de negocio puros
  infra/                     # adaptadores concretos (in-memory, http)
    persistence/in-memory/
  shared/
    state/                   # store global (Zustand) que usa casos de uso
    hooks/                   # hooks reutilizables (ej. useTheme)
    design-system/           # tokens de diseño
  ui/                        # componentes y páginas React
    components/
    pages/
  main.tsx                   # entrypoint Vite/React
```

## Arquitectura en limpio
- **Domain**: entidades (Event, Person, Invoice, Balance, SettlementTransfer) y servicios puros (calculateBalances, suggestTransfers). Soporta reparto igualitario, por consumo, propina opcional y redistribución del consumo del cumpleañero.
- **Application**: casos de uso (createEvent, addPersonToEvent, addInvoiceToEvent, removeInvoiceFromEvent, calculateSettlement, etc.) que usan puertos (EventRepository, InvoiceRepository, PersonRepository).
- **Infra**: implementaciones concretas de los puertos. En V1 solo InMemory*Repository, listo para ser reemplazado por HTTP/DB.
- **UI**: componentes React que interactúan con el store. El store orquesta casos de uso y mantiene el estado. Tema light/dark con toggle (persistido en `localStorage`) y estilos aplicados con los tokens del design system.

## Despliegue y CI
- Hosting sugerido: **Vercel** (SPA de Vite lista para previews por PR).
- CI en GitHub Actions: job básico `lint + test + build` en cada push/PR. (Se puede añadir un workflow en `.github/workflows/ci.yml` con Node 18+, `npm ci`, `npm run lint`, `npm run test`, `npm run build`).

## Cómo correr en local
1) Node 18+ y npm.
2) Instala deps: `npm install`
3) Corre dev server: `npm run dev` y abre la URL que muestra Vite.

## Notas rápidas
- Todo el estado vive en memoria; los repos in-memory implementan las interfaces de dominio para facilitar el swap por una API.
- Facturas: reparto igualitario o por consumo, propina opcional repartida igualitaria, y opción de cumpleañero que redistribuye su consumo.
- Saldos netos y transferencias sugeridas se calculan a partir de deudores/acreedores.
- UI usa design tokens y tiene toggle de tema (light/dark) persistido en `localStorage`.

## Backend API (opcional)
- Configura `VITE_API_BASE_URL` (ver `.env.example`) para que el frontend persista eventos (`POST /events`, hydrate `GET /events`), participantes (`/events/:id/participants`) y facturas (`/events/:id/invoices`). En la hidratación se traen eventos, participantes y facturas con detalle para reconstruir consumos localmente; si alguna llamada falla, se mantiene el flujo en memoria con IDs locales.
