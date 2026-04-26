import { render, screen } from '@testing-library/react'
import App from './app/App'

describe('App', () => {
  it('renders the MitiMiti headline', async () => {
    render(<App />)
    expect(
      await screen.findByText('Divide gastos entre amigos con claridad.'),
    ).toBeInTheDocument()
  })
})
