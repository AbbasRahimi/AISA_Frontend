import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import apiService from '../../services/api';
import { useAuthz } from '../../auth/AuthzContext';
import SeedBibliographySection from './SeedBibliographySection';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getSeedBibliography: jest.fn(),
    getSeedBibliographyComparison: jest.fn(),
    previewSeedBibliography: jest.fn(),
    storeSeedBibliography: jest.fn(),
    storeSeedBibliographyFile: jest.fn(),
    deleteBibliographyReference: jest.fn(),
    recomputeSeedBibliographyComparison: jest.fn(),
  },
}));

jest.mock('../../auth/AuthzContext', () => ({
  useAuthz: jest.fn(),
}));

const emptyComparison = {
  seed_paper_id: 5,
  total_ground_truth: 0,
  disclosed_count: 0,
  full_count: 0,
  partial_count: 0,
  not_disclosed_count: 0,
  rows: [],
};

const storedReference = {
  id: 41,
  title: 'Alpha Study',
  authors: 'Smith, John',
  year: 2020,
  doi: '10.1000/alpha',
  journal: 'Journal of Alpha',
  seed_paper_id: 5,
};

function grant({ admin = false, papers = true, ocr = true } = {}) {
  const permissions = new Set();
  if (papers) permissions.add('seed_papers');
  if (ocr) permissions.add('citation_ocr');
  useAuthz.mockReturnValue({ isAdmin: admin, permissions });
}

function renderSection(props = {}) {
  return render(
    <SeedBibliographySection
      seedPaperId={5}
      seedPaperTitle="Seed paper"
      groundTruthRevision={0}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  grant();
  apiService.getSeedBibliography.mockResolvedValue([]);
  apiService.getSeedBibliographyComparison.mockResolvedValue(emptyComparison);
});

describe('SeedBibliographySection access', () => {
  it('hides the section without seed_papers and does not call the API', async () => {
    grant({ papers: false, ocr: true });
    renderSection();
    expect(screen.queryByText(/Seed bibliography/)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiService.getSeedBibliography).not.toHaveBeenCalled();
    });
  });

  it('shows file import without citation_ocr and hides screenshot preview', async () => {
    grant({ papers: true, ocr: false });
    renderSection();
    expect(await screen.findByLabelText('Bibliography file')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reference-section screenshots')).not.toBeInTheDocument();
  });

  it('shows screenshot preview for an admin without the citation_ocr key', async () => {
    grant({ admin: true, papers: false, ocr: false });
    renderSection();
    expect(await screen.findByLabelText('Reference-section screenshots')).toBeInTheDocument();
  });
});

describe('SeedBibliographySection stored list and comparison', () => {
  it('shows an empty ground-truth comparison and the stored references', async () => {
    apiService.getSeedBibliography.mockResolvedValue([storedReference]);
    renderSection();

    expect(await screen.findByText('Alpha Study')).toBeInTheDocument();
    expect(screen.getByText('This seed paper has no ground truth yet.')).toBeInTheDocument();
    expect(screen.getByText('Bibliography count: 1')).toBeInTheDocument();
    expect(apiService.recomputeSeedBibliographyComparison).not.toHaveBeenCalled();
  });

  it('recomputes disclosure when the stored comparison is empty but ground truth already exists', async () => {
    apiService.recomputeSeedBibliographyComparison.mockResolvedValue({
      seed_paper_id: 5,
      total_ground_truth: 18,
      disclosed_count: 0,
      full_count: 0,
      partial_count: 0,
      not_disclosed_count: 18,
      rows: [
        {
          ground_truth_id: 1,
          ground_truth_title: 'Model Driven Approach for Neural Networks',
          disclosed: false,
          classification: 'NO_MATCH',
          similarity_score: 0,
          match_method: 'No Match',
          matched_bibliography_literature_id: null,
        },
      ],
    });
    renderSection({ groundTruthCount: 18, groundTruthReady: true });

    expect(await screen.findByText('Model Driven Approach for Neural Networks')).toBeInTheDocument();
    expect(screen.queryByText('This seed paper has no ground truth yet.')).not.toBeInTheDocument();
    expect(screen.getAllByText('18').length).toBeGreaterThan(0);
    expect(apiService.recomputeSeedBibliographyComparison).toHaveBeenCalledWith(5);
  });

  it('lists missing ground-truth citations and shows the literature id as text', async () => {
    apiService.getSeedBibliographyComparison.mockResolvedValue({
      seed_paper_id: 5,
      total_ground_truth: 2,
      disclosed_count: 1,
      full_count: 1,
      partial_count: 0,
      not_disclosed_count: 1,
      rows: [
        {
          ground_truth_id: 100,
          ground_truth_title: 'Missing Study',
          disclosed: false,
          classification: 'NO_MATCH',
          similarity_score: 0.1,
          match_method: 'No match',
          matched_bibliography_literature_id: null,
        },
        {
          ground_truth_id: 101,
          ground_truth_title: 'Found Study',
          disclosed: true,
          classification: 'FULL',
          similarity_score: 0.97,
          match_method: 'Exact title with authors and year',
          matched_bibliography_literature_id: 55,
        },
      ],
    });
    renderSection();

    expect(await screen.findByText('Missing Study')).toBeInTheDocument();
    expect(screen.getByText('Found Study')).toBeInTheDocument();
    expect(screen.getByText('FULL')).toBeInTheDocument();
    expect(screen.getByText('NO_MATCH')).toBeInTheDocument();
    expect(screen.getByText('0.97')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /55/ })).not.toBeInTheDocument();
  });

  it('recomputes disclosure after ground truth changes and keeps that failure off the ground-truth action', async () => {
    apiService.recomputeSeedBibliographyComparison.mockRejectedValue(new Error('matcher down'));
    const view = renderSection({ groundTruthRevision: 0 });
    await screen.findByText('This seed paper has no ground truth yet.');
    expect(apiService.recomputeSeedBibliographyComparison).not.toHaveBeenCalled();

    view.rerender(
      <SeedBibliographySection
        seedPaperId={5}
        seedPaperTitle="Seed paper"
        groundTruthRevision={1}
      />,
    );

    expect(await screen.findByText(/matcher down/)).toHaveTextContent('Ground truth was still updated.');
    expect(apiService.recomputeSeedBibliographyComparison).toHaveBeenCalledWith(5);
  });
});

describe('SeedBibliographySection import', () => {
  it('keeps a screenshot preview unsaved until approve', async () => {
    apiService.previewSeedBibliography.mockResolvedValue({
      citations: [
        {
          title: 'Alpha Study',
          authors: 'Smith, John',
          year: 2020,
          doi: '10.1000/alpha',
          journal: 'Journal of Alpha',
          booktitle: null,
          pages: null,
          volume: null,
          publisher: null,
          bibtex_key: 'alpha2020',
        },
      ],
    });
    apiService.storeSeedBibliography.mockResolvedValue({
      message: 'Stored 1 bibliography references',
      references: [storedReference],
    });
    renderSection();
    await screen.findByLabelText('Reference-section screenshots');

    const image = new File(['img'], 'refs.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Reference-section screenshots'), image);
    await userEvent.click(screen.getByRole('button', { name: /Preview screenshots/i }));

    const preview = await screen.findByLabelText('Extracted BibTeX preview');
    expect(preview.value).toContain('Alpha Study');
    expect(preview).toHaveAttribute('readonly');
    expect(apiService.storeSeedBibliography).not.toHaveBeenCalled();
    expect(apiService.storeSeedBibliographyFile).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const bibtex = screen.getByLabelText('Edit extracted BibTeX');
    fireEvent.change(bibtex, {
      target: { value: '@article{edited2021,\n  title = {Edited Study}\n}\n' },
    });
    await userEvent.click(screen.getByRole('button', { name: /Approve and store/i }));

    await waitFor(() => {
      expect(apiService.storeSeedBibliographyFile).toHaveBeenCalledWith(
        5,
        expect.any(File),
      );
    });
    const storedFile = apiService.storeSeedBibliographyFile.mock.calls[0][1];
    expect(storedFile.name).toBe('bibliography-preview.bib');
    const storedText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(storedFile);
    });
    expect(storedText).toContain('Edited Study');
    expect(apiService.storeSeedBibliography).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(apiService.getSeedBibliography.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(apiService.getSeedBibliographyComparison.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows leftover samples and sends a labeled sample with the previous examples', async () => {
    const sample = 'World Health Organization. Strategic framework for 2024.';
    apiService.previewSeedBibliography
      .mockResolvedValueOnce({
        citations: [
          {
            title: 'Alpha Study',
            authors: 'Smith, John',
            year: 2020,
            bibtex_key: 'alpha2020',
          },
        ],
        unmatched_groups: [{ count: 2, sample }],
        unmatchedCount: 5,
      })
      .mockResolvedValueOnce({
        citations: [
          {
            title: 'Alpha Study',
            authors: 'Smith, John',
            year: 2020,
            bibtex_key: 'alpha2020',
          },
        ],
        unmatched_groups: [],
        unmatchedCount: null,
      });
    renderSection();
    await screen.findByLabelText('Reference-section screenshots');

    await userEvent.click(screen.getByLabelText('Custom parser from examples'));
    await userEvent.type(
      screen.getByLabelText('Citation text (as printed)'),
      'Smith J. Alpha study. 2020.',
    );
    await userEvent.type(screen.getByLabelText('Author'), 'Smith J');

    const image = new File(['img'], 'refs.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Reference-section screenshots'), image);
    await userEvent.click(screen.getByRole('button', { name: /Preview screenshots/i }));

    expect(await screen.findByText('2 citations look like this sample.')).toBeInTheDocument();
    expect(screen.getByText(sample)).toBeInTheDocument();
    expect(screen.getByText('5 citations did not match.')).toBeInTheDocument();
    expect(
      screen.getByText('The total includes leftovers in shapes past the cap of 8.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /group/i })).not.toBeInTheDocument();

    const leftover = screen.getByRole('region', { name: '2 citations look like this sample.' });
    await userEvent.type(within(leftover).getByLabelText('Author'), 'World Health Organization');
    await userEvent.type(within(leftover).getByLabelText('Year'), '2024');
    await userEvent.click(screen.getByRole('button', { name: 'Label and preview again' }));

    await waitFor(() => {
      expect(apiService.previewSeedBibliography).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Labeled samples')).toBeInTheDocument();
    });
    const [firstOptions, secondOptions] = apiService.previewSeedBibliography.mock.calls.map(
      (call) => call[2],
    );
    expect(firstOptions.parserMode).toBe('example');
    expect(firstOptions.examples[0].text).toBe('Smith J. Alpha study. 2020.');
    expect(firstOptions.extraExamples).toEqual([]);
    expect(secondOptions.parserMode).toBe('example');
    expect(secondOptions.examples[0].text).toBe('Smith J. Alpha study. 2020.');
    expect(secondOptions.examples[0].fields.author).toBe('Smith J');
    expect(secondOptions.extraExamples).toEqual([
      {
        text: sample,
        fields: { author: 'World Health Organization', year: '2024' },
      },
    ]);
    expect(screen.getByText('Labeled samples')).toBeInTheDocument();
    expect(screen.queryByText('2 citations look like this sample.')).not.toBeInTheDocument();
  });

  it('edits screenshot citations in table view and switches back to BibTeX', async () => {
    apiService.previewSeedBibliography.mockResolvedValue({
      citations: [
        {
          title: 'Alpha Study',
          authors: 'Smith, John',
          year: 2020,
          doi: '10.1000/alpha',
          journal: 'Journal of Alpha',
          bibtex_key: 'alpha2020',
        },
      ],
    });
    renderSection();
    await screen.findByLabelText('Reference-section screenshots');
    const image = new File(['img'], 'refs.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Reference-section screenshots'), image);
    await userEvent.click(screen.getByRole('button', { name: /Preview screenshots/i }));

    await userEvent.click(await screen.findByRole('button', { name: 'Table view' }));
    const title = await screen.findByLabelText('Title for draft row 1');
    expect(title).toHaveValue('Alpha Study');
    const resizeTitle = screen.getByRole('separator', { name: 'Resize Title column' });
    fireEvent.mouseDown(resizeTitle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 180 });
    fireEvent.mouseUp(window);
    expect(title.closest('table').querySelector('colgroup').children[1]).toHaveStyle({ width: '300px' });
    fireEvent.change(title, { target: { value: 'Edited Study' } });

    await userEvent.click(screen.getByRole('button', { name: 'BibTeX' }));
    expect(screen.getByLabelText('Extracted BibTeX preview').value).toContain('Edited Study');
    expect(screen.getByRole('button', { name: 'Table view' })).toBeInTheDocument();
    expect(apiService.storeSeedBibliographyFile).not.toHaveBeenCalled();
  });

  it('warns before a second file import and rejects other extensions', async () => {
    apiService.getSeedBibliography.mockResolvedValue([storedReference]);
    apiService.storeSeedBibliographyFile.mockResolvedValue({
      message: 'Stored 1 bibliography references',
      references: [storedReference],
    });
    renderSection();
    await screen.findByText('Alpha Study');

    const bad = new File(['nope'], 'notes.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText('Bibliography file'), bad);
    expect(await screen.findByText(/Unsupported file type/)).toBeInTheDocument();
    expect(apiService.storeSeedBibliographyFile).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Bibliography file')).toHaveAttribute(
      'accept',
      '.bib,.bibtex,.json,.ris,.csv',
    );

    window.confirm.mockReturnValueOnce(false);
    const bib = new File(['@article{a}'], 'refs.bibtex', { type: 'application/x-bibtex' });
    await userEvent.upload(screen.getByLabelText('Bibliography file'), bib);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('previous list will be deleted'));
    expect(apiService.storeSeedBibliographyFile).not.toHaveBeenCalled();

    window.confirm.mockReturnValueOnce(true);
    const bibAgain = new File(['@article{b}'], 'refs-again.bib', { type: 'application/x-bibtex' });
    await userEvent.upload(screen.getByLabelText('Bibliography file'), bibAgain);
    await waitFor(() => {
      expect(apiService.storeSeedBibliographyFile).toHaveBeenCalledWith(5, bibAgain);
    });
  });

  it('deletes by bibliography link id and reloads after a 404', async () => {
    apiService.getSeedBibliography.mockResolvedValue([storedReference]);
    const gone = new Error('Bibliography reference not found');
    gone.status = 404;
    apiService.deleteBibliographyReference.mockRejectedValueOnce(gone);
    renderSection();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete bibliography reference: Alpha Study' }),
    );

    await waitFor(() => {
      expect(apiService.deleteBibliographyReference).toHaveBeenCalledWith(41);
    });
    expect(apiService.getSeedBibliography.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(apiService.getSeedBibliographyComparison.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText('Bibliography reference not found')).toBeInTheDocument();
  });
});
