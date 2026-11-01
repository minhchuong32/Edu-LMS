
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Frontend Edu-LMS', () => {
  it('chạy được môi trường test', () => {
    render(<div>Edu-LMS</div>)

    expect(screen.getByText('Edu-LMS')).toBeInTheDocument()
  })
})
