import { useEffect, useMemo, useState } from 'react'

function DataTable({ rows, columns, pageSize = 10, rowKey = 'id' }) {
  const [sort, setSort] = useState({ key: '', direction: 'ascending' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLength, setPageLength] = useState(pageSize)
  const pageSizes = [...new Set([pageSize, 10, 20, 50])].sort((left, right) => left - right)

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows
    const column = columns.find((item) => item.key === sort.key)
    if (!column) return rows

    return [...rows].sort((left, right) => {
      const leftValue = column.sortValue ? column.sortValue(left) : left[column.key]
      const rightValue = column.sortValue ? column.sortValue(right) : right[column.key]
      const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      return sort.direction === 'ascending' ? comparison : -comparison
    })
  }, [columns, rows, sort])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageLength))
  const page = Math.min(currentPage, pageCount)
  const visibleRows = sortedRows.slice((page - 1) * pageLength, page * pageLength)

  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  function toggleSort(column) {
    if (!column.key || column.sortable === false) return
    setSort((current) => ({
      key: column.key,
      direction: current.key === column.key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
    setCurrentPage(1)
  }

  return (
    <>
      <div className="table-scroll">
        <table className="records-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const activeSort = sort.key === column.key
                const direction = activeSort ? sort.direction : 'none'
                return (
                  <th key={column.label} scope="col" aria-sort={column.key ? direction : undefined}>
                    {column.sortable === false || !column.key ? column.label : (
                      <button className="table-sort-button" type="button" onClick={() => toggleSort(column)}>
                        {column.label}
                        <span aria-hidden="true">{activeSort ? (sort.direction === 'ascending' ? ' ↑' : ' ↓') : ' ↕'}</span>
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={row[rowKey] ?? index}>
                {columns.map((column) => (
                  <td key={column.label} className={column.className}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRows.length > 0 && (
        <div className="table-pagination">
          <label>
            Rows per page
            <select
              value={pageLength}
              onChange={(event) => {
                setPageLength(Number(event.target.value))
                setCurrentPage(1)
              }}
            >
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <span>{(page - 1) * pageLength + 1}–{Math.min(page * pageLength, sortedRows.length)} of {sortedRows.length}</span>
          <button type="button" className="button button-quiet" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</button>
          <button type="button" className="button button-quiet" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>Next</button>
        </div>
      )}
    </>
  )
}

export default DataTable
