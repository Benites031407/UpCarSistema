import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render the app title', () => {
    render(<App />)
    expect(screen.getByText('UpCar Aspiradores')).toBeInTheDocument()
  })

  it('should render the main heading', () => {
    render(<App />)
    expect(screen.getByText('Access Your Machine')).toBeInTheDocument()
  })

  it('should render QR scanner section', () => {
    render(<App />)
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument()
    expect(screen.getByText('Start Camera')).toBeInTheDocument()
  })

  it('should render manual entry section', () => {
    render(<App />)
    expect(screen.getByText('Enter Machine Code')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument()
  })
})