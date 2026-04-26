import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EventDetailPage from './EventDetailPage'
import { useAppStore as usemitimitiStore } from '../../shared/state/appStore'

describe('EventDetailPage', () => {
  beforeEach(() => {
    usemitimitiStore.setState({
      events: [],
      selectedEventId: undefined,
      hasSeededDemo: false,
    })
  })

  it('renders event name and currency in header', async () => {
    const { createEvent, hydrate, seedDemoData, selectEvent } =
      usemitimitiStore.getState()

    const created = await createEvent({ name: 'Fiesta', currency: 'EUR' })
    if (!created) throw new Error('Expected event to be created in guest mode')
    await hydrate()
    await seedDemoData()
    selectEvent(created.id)

    render(
      <MemoryRouter initialEntries={[`/events/${created.id}`]}>
        <Routes>
          <Route path="/events/:eventId" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: /Fiesta/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Moneda: EUR/i)).toBeInTheDocument()
  })

  it('allows switching tabs without losing context', async () => {
    const { createEvent, selectEvent } = usemitimitiStore.getState()
    const created = await createEvent({ name: 'Tabs', currency: 'USD' })
    if (!created) throw new Error('Expected event to be created in guest mode')
    selectEvent(created.id)

    render(
      <MemoryRouter initialEntries={[`/events/${created.id}`]}>
        <Routes>
          <Route path="/events/:eventId" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const resumenButtons = screen.getAllByRole('button', { name: /Resumen/i })
    expect(resumenButtons.length).toBeGreaterThan(0)
    await userEvent.click(resumenButtons[0])
    expect(screen.getByText(/Resumen por persona/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Transferencias/i }))
    expect(screen.getByText(/Transferencias sugeridas/i)).toBeInTheDocument()
  })
})
