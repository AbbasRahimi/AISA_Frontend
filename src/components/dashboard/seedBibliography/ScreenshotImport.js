import CitationParserOptions from '../../citationParser/CitationParserOptions';
import { MAX_SCREENSHOTS, SCREENSHOT_ACCEPT } from './bibliographyFiles';

export default function ScreenshotImport({
  files,
  busy,
  parserMode,
  onParserModeChange,
  examples,
  onExamplesChange,
  lockedExamples,
  onRemoveLockedExample,
  onFilesSelected,
  onRemoveFile,
  onPreview,
}) {
  return (
    <div className="col-lg-6">
      <label htmlFor="seedBibliographyScreenshots" className="form-label">
        Reference-section screenshots
      </label>
      <input
        id="seedBibliographyScreenshots"
        type="file"
        className="form-control"
        accept={SCREENSHOT_ACCEPT}
        multiple
        disabled={busy}
        onChange={onFilesSelected}
      />
      <div className="form-text">
        PNG, JPG, JPEG, TIF, TIFF, BMP, WEBP, or GIF. Up to {MAX_SCREENSHOTS} files, 10 MB
        each. Preview does not save.
      </div>
      {files.length > 0 && (
        <ul className="list-group list-group-flush mt-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="list-group-item d-flex justify-content-between align-items-center px-0"
            >
              <span className="text-truncate me-2" title={file.name}>
                {index + 1}. {file.name}
              </span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={busy}
                aria-label={`Remove screenshot ${file.name}`}
                onClick={() => onRemoveFile(index)}
              >
                <i className="fas fa-times"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
      <CitationParserOptions
        parserMode={parserMode}
        onParserModeChange={onParserModeChange}
        examples={examples}
        onExamplesChange={onExamplesChange}
        lockedExamples={lockedExamples}
        onRemoveLockedExample={onRemoveLockedExample}
        disabled={busy}
        idPrefix="seedBibParser"
      />
      <button
        type="button"
        className="btn btn-outline-primary btn-sm mt-2"
        disabled={busy || files.length === 0}
        onClick={onPreview}
      >
        {busy ? (
          <span className="spinner-border spinner-border-sm me-1" role="status" />
        ) : (
          <i className="fas fa-file-image me-1"></i>
        )}
        Preview screenshots
      </button>
    </div>
  );
}
