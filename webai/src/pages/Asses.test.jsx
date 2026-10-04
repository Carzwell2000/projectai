import { fireEvent, render, screen } from '@testing-library/react'
import Asses from './Asses'

describe('Asses', () => {
  it('shows the selected patient age in the assessment form', () => {
    const patients = [{
      id: 'p1',
      name: 'Alice Johnson',
      dateOfBirth: '1990-05-20',
      gender: 'Female',
    }]

    render(<Asses patients={patients} onSubmit={jest.fn()} onExplain={jest.fn()} />)

    const patientSelect = screen.getByLabelText(/patient/i)
    fireEvent.change(patientSelect, { target: { value: 'p1' } })

    expect(screen.getByLabelText(/patient age/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('35')).toBeInTheDocument()
  })
})
