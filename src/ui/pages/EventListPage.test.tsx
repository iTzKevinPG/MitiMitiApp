import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EventListPage from './EventListPage'
import { useAppStore as useFairSplitStore } from '../../shared/state/appStore'

describe('EventListPage', () => {
  beforeEach(() => {
    useFairSplitStore.setState({
      events: [],
      selectedEventId: undefined,
      hasSeededDemo: false,
    })
  })

  it('shows empty state when no events', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<EventListPage />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    expect(screen.getByTestId('empty-events')).toBeInTheDocument()
    expect(screen.getByText(/Aun no tienes eventos/i)).toBeInTheDocument()
  })

  it('navigates to event detail when clicking a card', async () => {
    const { createEvent } = useFairSplitStore.getState()
    const event = await createEvent({ name: 'Viaje', currency: 'USD' })
    if (!event) throw new Error('Expected event to be created in guest mode')

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<EventListPage />} />
          <Route path="/events/:eventId" element={<div>Detail</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByText(event.name))
    expect(await screen.findByText('Detail')).toBeInTheDocument()
  })
})
