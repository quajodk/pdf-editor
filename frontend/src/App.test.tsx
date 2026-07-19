import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./components/PDFEditor', () => ({
  default: () => null,
}));

import App from './App';

describe('App', () => {
  it('renders the PDF Editor heading', () => {
    render(<App />);
    expect(screen.getByText('PDF Editor')).toBeInTheDocument();
  });
});
