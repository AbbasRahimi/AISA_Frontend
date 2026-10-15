import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import apiService from '../../services/api';
import { useAuthz } from '../../auth/AuthzContext';
import CitationOcrPage from './CitationOcrPage';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    extractCitationOcr: jest.fn(),
  },
}));

jest.mock('../../auth/AuthzContext', () => ({
  useAuthz: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthz.mockReturnValue({
    isAdmin: false,
    permissions: new Set(['citation_ocr']),
  });
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

it('keeps OCR text and each page collapsed until opened', async () => {
  apiService.extractCitationOcr.mockResolvedValue({
    bibtex: '@misc{grifferty2021, title = {Review}}',
    ocrTexts: ['REFERENCES\n1 Grifferty G', 'Second page text'],
    unmatchedCount: null,
    unmatchedGroups: [],
  });

  const { container } = render(<CitationOcrPage />);
  const input = container.querySelector('input[type="file"]');
  const image = new File(['img'], 'refs.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [image] } });
  await userEvent.click(screen.getByRole('button', { name: /Extract BibTeX/i }));

  const section = await screen.findByRole('button', { name: 'OCR text' });
  expect(section).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: 'Page 1' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Grifferty/)).not.toBeInTheDocument();

  await userEvent.click(section);
  const pageOne = screen.getByRole('button', { name: 'Page 1' });
  const pageTwo = screen.getByRole('button', { name: 'Page 2' });
  expect(pageOne).toHaveAttribute('aria-expanded', 'false');
  expect(pageTwo).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/Grifferty/)).not.toBeInTheDocument();

  await userEvent.click(pageOne);
  expect(pageOne).toHaveAttribute('aria-expanded', 'true');
  expect(pageTwo).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText(/Grifferty/)).toBeInTheDocument();
  expect(screen.queryByText('Second page text')).not.toBeInTheDocument();
});
