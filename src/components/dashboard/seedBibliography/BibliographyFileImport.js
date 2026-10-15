import { BIBLIOGRAPHY_FILE_ACCEPT } from './bibliographyFiles';

export default function BibliographyFileImport({ busy, loadingList, fullWidth, onFile }) {
  return (
    <div className={fullWidth ? 'col-12' : 'col-lg-6'}>
      <label htmlFor="seedBibliographyFile" className="form-label">
        Bibliography file
      </label>
      <input
        id="seedBibliographyFile"
        type="file"
        className="form-control"
        accept={BIBLIOGRAPHY_FILE_ACCEPT}
        disabled={busy || loadingList}
        onChange={onFile}
      />
      <div className="form-text">
        BibTeX (.bib, .bibtex), JSON (.json), RIS (.ris), or CSV (.csv). This stores
        immediately and replaces the bibliography for this seed paper.
      </div>
    </div>
  );
}
