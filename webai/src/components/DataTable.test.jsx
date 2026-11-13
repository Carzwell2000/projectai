import React from 'react'
import ReactDOM from 'react-dom'
import { act, Simulate } from 'react-dom/test-utils'
import DataTable from './DataTable'

describe('DataTable', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })
    container.remove()
  })

  it('sorts rows and paginates without a grid component', () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: String(index),
      name: `Patient ${String(11 - index).padStart(2, '0')}`,
    }))
    const columns = [{ key: 'name', label: 'Patient' }]

    act(() => {
      ReactDOM.render(<DataTable rows={rows} columns={columns} />, container)
    })
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10)

    act(() => Simulate.click(container.querySelector('.table-sort-button')))
    expect(container.querySelector('tbody tr').textContent).toBe('Patient 01')

    act(() => Simulate.click(container.querySelector('.table-pagination button:last-child')))
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
    expect(container.textContent).toContain('Patient 11')
  })
})
