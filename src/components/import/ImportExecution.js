import React, { useState, useRef, useEffect } from 'react';
import apiService from '../../services/api';
import {
  ACCEPT_EXTENSIONS,
  FILENAME_PATTERN,
  EXAMPLE_FILENAME,
  parseExecutionFilename,
  readFileAsText,
  isNaExecutionFile,
  hasImportExecutionExtension,
  interpretImportExecutionResponse,
} from './importExecutionUtils';
import FilenameMetadataCard from './FilenameMetadataCard';
import AddSeedPaperCard from './AddSeedPaperCard';
import AddGroundTruthCard from './AddGroundTruthCard';
import AddPromptCard from './AddPromptCard';
import ImportHistoryList from './ImportHistoryList';

export default function ImportExecution() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [missingDataResponse, setMissingDataResponse] = useState(null);
  const fileInputRef = useRef(null);

  const [parsedMeta, setParsedMeta] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [matchedSeedPaper, setMatchedSeedPaper] = useState(null);
  const [matchedPrompt, setMatchedPrompt] = useState(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  const [addSeedPaperPaste, setAddSeedPaperPaste] = useState('');
  const [addSeedPaperFile, setAddSeedPaperFile] = useState(null);
  const [addSeedPaperAlias, setAddSeedPaperAlias] = useState('');
  const [addPromptVersion, setAddPromptVersion] = useState('');
  const [addPromptAlias, setAddPromptAlias] = useState('');
  const [addPromptContent, setAddPromptContent] = useState('');
  const [addPromptFile, setAddPromptFile] = useState(null);
  const [addSeedPaperLoading, setAddSeedPaperLoading] = useState(false);
  const [addPromptLoading, setAddPromptLoading] = useState(false);
  const [groundTruthFile, setGroundTruthFile] = useState(null);
  const [groundTruthReferences, setGroundTruthReferences] = useState([]);
  const [addGroundTruthLoading, setAddGroundTruthLoading] = useState(false);
  const addSeedPaperInputRef = useRef(null);
  const addPromptFileInputRef = useRef(null);
  const groundTruthInputRef = useRef(null);

  const primaryFile = files[0] ?? null;
  const isMultiFile = files.length > 1;

  // When selected file(s) change, parse first file for metadata cards (single-file flow)
  useEffect(() => {
    if (!primaryFile || isMultiFile) {
      setParsedMeta(null);
      setMatchedSeedPaper(null);
      setMatchedPrompt(null);
      return;
    }
    const meta = parseExecutionFilename(primaryFile.name);
    setParsedMeta(meta);
    setMatchedSeedPaper(null);
    setMatchedPrompt(null);
  }, [primaryFile, isMultiFile]);

  // Fetch seed papers and prompts and check existence when we have parsed meta
  useEffect(() => {
    if (!parsedMeta) return;
    let cancelled = false;
    setCheckLoading(true);
    Promise.all([
      apiService.getSeedPapers({ cache: 'no-store' }),
      apiService.getPrompts({ cache: 'no-store' }),
    ])
      .then(([seedPapers, prompts]) => {
        if (cancelled) return;
        const spList = Array.isArray(seedPapers) ? seedPapers : [];
        const prList = Array.isArray(prompts) ? prompts : [];

        const { seed_paper_alias } = parsedMeta;
        const aliasTrimmed = String(seed_paper_alias || '').trim();
        const seedPaper = spList.find(
          (sp) =>
            String(sp.alias || '').trim() === aliasTrimmed ||
            String(sp.bibtex_key || '').trim() === aliasTrimmed ||
            String(sp.id) === aliasTrimmed
        );
        setMatchedSeedPaper(seedPaper || null);

        if (!seedPaper) {
          setMatchedPrompt(null);
          return;
        }
        const promptsForSeed = prList.filter((p) => p.seed_paper_id === seedPaper.id);
        const promptIdTrimmed = String(parsedMeta.prompt_id || '').trim();
        const byAlias = promptIdTrimmed
          ? promptsForSeed.find(
              (p) => String(p.alias || p.identifier || '').trim() === promptIdTrimmed
            )
          : null;
        const byAliasAndVersion = parsedMeta.prompt_version && promptIdTrimmed
          ? promptsForSeed.find(
              (p) =>
                String(p.alias || p.identifier || '').trim() === promptIdTrimmed &&
                (p.version || '').toLowerCase() === (parsedMeta.prompt_version || '').toLowerCase()
            )
          : null;
        setMatchedPrompt(byAliasAndVersion || byAlias || null);
      })
      .catch(() => {
        if (!cancelled) {
          setMatchedSeedPaper(null);
          setMatchedPrompt(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckLoading(false);
      });
    return () => { cancelled = true; };
  }, [parsedMeta, checkTrigger]);

  const runExistenceCheck = () => setCheckTrigger((t) => t + 1);

  const handleRefreshMetadataFromFilename = () => {
    if (!primaryFile) return;
    setMatchedSeedPaper(null);
    setMatchedPrompt(null);
    setParsedMeta(parseExecutionFilename(primaryFile.name));
  };

  useEffect(() => {
    if (parsedMeta?.seed_paper_alias) {
      setAddSeedPaperAlias(parsedMeta.seed_paper_alias);
    } else {
      setAddSeedPaperAlias('');
    }
  }, [parsedMeta?.seed_paper_alias]);

  useEffect(() => {
    if (parsedMeta?.prompt_id) {
      setAddPromptAlias(parsedMeta.prompt_id);
    } else {
      setAddPromptAlias('');
    }
  }, [parsedMeta?.prompt_id]);

  useEffect(() => {
    if (parsedMeta?.prompt_version) {
      setAddPromptVersion(parsedMeta.prompt_version);
    } else {
      setAddPromptVersion('');
    }
  }, [parsedMeta?.prompt_version]);

  // Load ground truth references when matched seed paper is set (e.g. after adding seed paper)
  useEffect(() => {
    if (!matchedSeedPaper?.id) {
      setGroundTruthReferences([]);
      return;
    }
    let cancelled = false;
    apiService.getGroundTruthReferences(matchedSeedPaper.id).then((refs) => {
      if (!cancelled) setGroundTruthReferences(Array.isArray(refs) ? refs : []);
    }).catch(() => {
      if (!cancelled) setGroundTruthReferences([]);
    });
    return () => { cancelled = true; };
  }, [matchedSeedPaper?.id]);

  const handleAddGroundTruth = async () => {
    if (!matchedSeedPaper?.id || !groundTruthFile) return;
    setAddGroundTruthLoading(true);
    setError(null);
    try {
      await apiService.addGroundTruthReferences(matchedSeedPaper.id, groundTruthFile);
      const refs = await apiService.getGroundTruthReferences(matchedSeedPaper.id);
      setGroundTruthReferences(Array.isArray(refs) ? refs : []);
      setGroundTruthFile(null);
      if (groundTruthInputRef.current) groundTruthInputRef.current.value = '';
    } catch (err) {
      setError('Failed to add ground truth: ' + (err?.message || ''));
    } finally {
      setAddGroundTruthLoading(false);
    }
  };

  const handleAddSeedPaperToDb = async () => {
    let seedPaperContentStr = addSeedPaperPaste.trim();
    if (addSeedPaperFile && !seedPaperContentStr) {
      try {
        seedPaperContentStr = await readFileAsText(addSeedPaperFile);
      } catch (e) {
        setError('Failed to read BibTeX file.');
        return;
      }
    }
    if (!seedPaperContentStr) {
      setError('Provide a BibTeX file or paste BibTeX content.');
      return;
    }
    const aliasTrimmed = addSeedPaperAlias.trim();
    if (!aliasTrimmed) {
      setError('Enter an alias for the seed paper (e.g. the value from the filename).');
      return;
    }
    setAddSeedPaperLoading(true);
    setError(null);
    try {
      // Only add the seed paper to DB; do not send the execution file.
      const seedPaperFile = addSeedPaperFile || new File([seedPaperContentStr], 'seed.bib', { type: 'text/plain' });
      const response = await apiService.addSeedPaper(seedPaperFile, aliasTrimmed);
      setAddSeedPaperPaste('');
      setAddSeedPaperFile(null);
      setAddSeedPaperAlias('');
      if (addSeedPaperInputRef.current) addSeedPaperInputRef.current.value = '';
      const createdSeedPaper = response?.id != null ? response : null;
      if (createdSeedPaper) {
        setMatchedSeedPaper({
          id: createdSeedPaper.id,
          alias: createdSeedPaper.alias ?? createdSeedPaper.identifier ?? aliasTrimmed,
          ...createdSeedPaper,
        });
      }
      setCheckLoading(true);
      await new Promise((r) => setTimeout(r, 150));
      try {
        const [seedPapers, prompts] = await Promise.all([
          apiService.getSeedPapers({ cache: 'no-store' }),
          apiService.getPrompts({ cache: 'no-store' }),
        ]);
        const spList = Array.isArray(seedPapers) ? seedPapers : [];
        const prList = Array.isArray(prompts) ? prompts : [];
        const seedPaper = spList.find(
          (sp) =>
            String(sp.alias || '').trim() === aliasTrimmed ||
            String(sp.bibtex_key || '').trim() === aliasTrimmed ||
            String(sp.id) === aliasTrimmed
        );
        setMatchedSeedPaper(seedPaper || (createdSeedPaper ? { id: createdSeedPaper.id, alias: aliasTrimmed, ...createdSeedPaper } : null));
        if (seedPaper) {
          const promptsForSeed = prList.filter((p) => p.seed_paper_id === seedPaper.id);
          const promptIdTrimmed = String(parsedMeta?.prompt_id || '').trim();
          const byAlias = promptIdTrimmed
            ? promptsForSeed.find(
                (p) => String(p.alias || p.identifier || '').trim() === promptIdTrimmed
              )
            : null;
          const byAliasAndVersion = parsedMeta?.prompt_version && promptIdTrimmed
            ? promptsForSeed.find(
                (p) =>
                  String(p.alias || p.identifier || '').trim() === promptIdTrimmed &&
                  (p.version || '').toLowerCase() === (parsedMeta.prompt_version || '').toLowerCase()
              )
            : null;
          setMatchedPrompt(byAliasAndVersion || byAlias || null);
        } else {
          setMatchedPrompt(null);
        }
      } catch (e) {
        runExistenceCheck();
      } finally {
        setCheckLoading(false);
      }
    } catch (err) {
      setError('Failed to add seed paper: ' + (err?.message || ''));
    } finally {
      setAddSeedPaperLoading(false);
    }
  };

  const handleAddPromptToDb = async () => {
    if (!matchedSeedPaper) return;
    const version = addPromptVersion.trim();
    if (!version) {
      setError('Enter a prompt version (e.g. v1).');
      return;
    }
    const aliasTrimmed = addPromptAlias.trim();
    if (!aliasTrimmed) {
      setError('Enter an alias for the prompt (e.g. the value from the filename).');
      return;
    }
    const hasContent = addPromptContent.trim().length > 0;
    const hasFile = addPromptFile != null;
    if (!hasContent && !hasFile) {
      setError('Provide prompt content (paste text or upload a .txt file).');
      return;
    }
    setAddPromptLoading(true);
    setError(null);
    try {
      await apiService.addPrompt(
        {
          content: hasContent ? addPromptContent.trim() : undefined,
          file: hasFile ? addPromptFile : undefined,
        },
        matchedSeedPaper.id,
        version,
        aliasTrimmed
      );
      setAddPromptVersion('');
      setAddPromptAlias('');
      setAddPromptContent('');
      setAddPromptFile(null);
      if (addPromptFileInputRef.current) addPromptFileInputRef.current.value = '';
      runExistenceCheck();
    } catch (err) {
      setError('Failed to add prompt: ' + (err?.message || ''));
    } finally {
      setAddPromptLoading(false);
    }
  };

  const uploadableFiles = files.filter((f) => hasImportExecutionExtension(f.name));

  const singleFileReady =
    files.length === 1 &&
    parsedMeta &&
    !checkLoading &&
    matchedSeedPaper &&
    matchedPrompt;

  const multiFileReady = isMultiFile && uploadableFiles.length > 0;

  const canAddToDb =
    files.length > 0 &&
    !loading &&
    !missingDataResponse &&
    uploadableFiles.length > 0 &&
    (singleFileReady || multiFileReady);

  const clearMissingDataForm = () => {
    setMissingDataResponse(null);
  };

  const handleFileChange = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length) {
      setFiles(list);
      setError(null);
      setMissingDataResponse(null);
    } else {
      setFiles([]);
      clearMissingDataForm();
    }
  };

  const handleAddToDb = async () => {
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    const uploadable = files.filter((f) => hasImportExecutionExtension(f.name));
    const skippedExt = files.filter((f) => !hasImportExecutionExtension(f.name));

    if (uploadable.length === 0) {
      setError('No files with a supported extension (.json, .bib, .txt).');
      return;
    }

    setLoading(true);
    setError(null);
    setMissingDataResponse(null);

    const createdAt = new Date().toISOString();

    const pushSkippedExtensionEntries = () => {
      if (skippedExt.length === 0) return [];
      return [
        {
          type: 'error',
          fileName: skippedExt.map((f) => f.name).join(', '),
          createdAt,
          message:
            'Not uploaded — unsupported extension (only .json, .bib, and .txt are sent to the server).',
        },
      ];
    };

    try {
      const options = {};
      if (uploadable.length === 1 && isNaExecutionFile(uploadable[0].name)) {
        try {
          const fileContent = await readFileAsText(uploadable[0]);
          if (fileContent && fileContent.trim() !== '') {
            options.execution_comment = fileContent.trim();
          }
        } catch (e) {
          setError('Failed to read _na file content.');
          setLoading(false);
          return;
        }
      }

      const response = await apiService.importExecutionFromFiles(uploadable, options);

      if (response.status === 'missing_data') {
        setMissingDataResponse(response);
        return;
      }

      const interpreted = interpretImportExecutionResponse(response, uploadable.length);

      if (uploadable.length > 1 && interpreted.kind !== 'batch') {
        setError(
          'Multiple files were sent but the server did not return a batch results list. Import files one at a time or update the API.'
        );
        return;
      }

      if (interpreted.kind === 'batch') {
        const newEntries = [...pushSkippedExtensionEntries()];
        let successCount = 0;
        let failCount = 0;

        for (const item of interpreted.items) {
          const inner =
            item.raw?.result && typeof item.raw.result === 'object' ? item.raw.result : null;
          const report =
            item.report ||
            item.raw?.insertion_report ||
            (inner?.insertion_report && typeof inner.insertion_report === 'object'
              ? inner.insertion_report
              : null) ||
            null;
          if (report) {
            successCount += 1;
            newEntries.push({
              type: 'success',
              fileName: item.fileName,
              createdAt,
              data: inner ?? item.raw,
              report,
            });
          } else if (item.ok) {
            successCount += 1;
            newEntries.push({
              type: 'success',
              fileName: item.fileName,
              createdAt,
              data: inner ?? item.raw,
              report: null,
            });
          } else {
            failCount += 1;
            newEntries.push({
              type: 'error',
              fileName: item.fileName,
              createdAt,
              message: item.message || 'Import failed for this file.',
            });
          }
        }

        setImportHistory((prev) => [...newEntries, ...prev]);
        setFiles([]);
        clearMissingDataForm();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        const summaryParts = [];
        if (successCount) summaryParts.push(`${successCount} imported`);
        if (failCount) summaryParts.push(`${failCount} failed`);
        if (skippedExt.length) summaryParts.push(`${skippedExt.length} skipped (bad extension)`);
        setError(
          failCount > 0 || skippedExt.length > 0
            ? `Batch finished: ${summaryParts.join(', ')}. Details are in import attempts below.`
            : null
        );
        return;
      }

      const r = interpreted.raw;
      const fileName = uploadable[0].name;

      if (r.status === 'success' || r.insertion_report) {
        setImportHistory((prev) => [
          ...pushSkippedExtensionEntries(),
          {
            type: 'success',
            fileName,
            createdAt,
            data: r,
            report: r.insertion_report,
          },
          ...prev,
        ]);
        setFiles([]);
        clearMissingDataForm();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setError(skippedExt.length ? `Imported 1 file; ${skippedExt.length} skipped (bad extension). See below.` : null);
        return;
      }

      setError('Unexpected response from server.');
    } catch (err) {
      const message = err?.message || 'Import failed';
      const primaryName = uploadable[0]?.name ?? files[0]?.name ?? 'unknown';
      const promptNotFoundMatch = message.match(/Prompt with id (\d+) not found/i);
      if (promptNotFoundMatch) {
        setMissingDataResponse({
          status: 'missing_data',
          requires_prompt: true,
          requires_seed_paper: false,
          message: `The file name refers to prompt ID ${promptNotFoundMatch[1]} which is not in the database. Select a seed paper and create the prompt below (version and content), then continue import.`,
          existing_prompts: [],
          existing_seed_papers: [],
        });
        setError(null);
        return;
      }
      const seedPaperNotFoundMatch = message.match(/Seed paper (?:with id )?(\d+ )?not found/i) || message.match(/Seed paper .* not found/i);
      if (seedPaperNotFoundMatch) {
        const idPart = message.match(/Seed paper with id (\d+) not found/i);
        const hint = idPart ? ` (ID ${idPart[1]} from file name)` : '';
        setMissingDataResponse({
          status: 'missing_data',
          requires_seed_paper: true,
          requires_prompt: false,
          message: `The file name refers to a seed paper that is not in the database${hint}. Add a new seed paper below (upload BibTeX file or paste), then continue import.`,
          existing_seed_papers: [],
          existing_prompts: [],
        });
        setError(null);
        return;
      }
      setImportHistory((prev) => [
        ...pushSkippedExtensionEntries(),
        {
          type: 'error',
          fileName: primaryName,
          createdAt,
          message,
        },
        ...prev,
      ]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setImportHistory([]);
    setError(null);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-file-import me-2"></i>
            Import execution from file
          </h2>
          <p className="text-muted">
            Upload one or more JSON or BibTeX files (publication lists) exported from a manual run, or <code>_na.txt</code> files for no-result runs. Each file name should follow the naming format so metadata can be resolved (single-file mode checks seed paper and prompt before import). For multiple files, the server processes each file and skips problematic ones; results appear under Import attempts.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-upload me-2"></i>
                Upload file(s)
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label fw-bold">File(s) (JSON, BibTeX, or .txt for no-result)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept={ACCEPT_EXTENSIONS}
                  multiple
                  onChange={handleFileChange}
                />
                {files.length > 0 && (
                  <ul className="list-unstyled mt-2 mb-0 small text-muted">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}-${f.lastModified}`} className="mb-1">
                        <i className="fas fa-file me-1"></i>
                        {f.name} ({(f.size / 1024).toFixed(2)} KB)
                        {!hasImportExecutionExtension(f.name) && (
                          <span className="text-warning ms-1">— not uploaded (use .json, .bib, or .txt)</span>
                        )}
                        {files.length === 1 && isNaExecutionFile(f.name) && (
                          <span className="d-block mt-1 text-info">No-result execution — stored with 0 publications; file body (if any) as execution comment.</span>
                        )}
                        {isMultiFile && hasImportExecutionExtension(f.name) && !parseExecutionFilename(f.name) && (
                          <span className="d-block mt-1 text-warning">Filename may not match the expected pattern — the server may reject or skip this file.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isMultiFile && files.length > 0 && (
                <div className="alert alert-info small mb-3">
                  <strong>Multi-file import:</strong> all supported files are sent in one request. Problematic files are skipped on the server; see <strong>Import attempts</strong> for each outcome. The seed paper / prompt panels below apply only when exactly one file is selected.
                </div>
              )}

              {files.length > 0 && !isMultiFile && (
                <>
                  {checkLoading ? (
                    <div className="mb-3 text-muted small">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Checking database…
                    </div>
                  ) : parsedMeta ? (
                    <FilenameMetadataCard
                      parsedMeta={parsedMeta}
                      matchedSeedPaper={matchedSeedPaper}
                      matchedPrompt={matchedPrompt}
                      checkLoading={checkLoading}
                      onRefresh={handleRefreshMetadataFromFilename}
                    />
                  ) : (
                    <div className="alert alert-warning small mb-3">
                      Invalid filename format. Expected: <code>{FILENAME_PATTERN}</code>
                    </div>
                  )}

                  {parsedMeta && !matchedSeedPaper && !checkLoading && (
                    <AddSeedPaperCard
                      parsedMeta={parsedMeta}
                      addSeedPaperAlias={addSeedPaperAlias}
                      setAddSeedPaperAlias={setAddSeedPaperAlias}
                      addSeedPaperPaste={addSeedPaperPaste}
                      setAddSeedPaperPaste={setAddSeedPaperPaste}
                      addSeedPaperFile={addSeedPaperFile}
                      setAddSeedPaperFile={setAddSeedPaperFile}
                      addSeedPaperInputRef={addSeedPaperInputRef}
                      addSeedPaperLoading={addSeedPaperLoading}
                      onAddSeedPaper={handleAddSeedPaperToDb}
                    />
                  )}

                  {parsedMeta && matchedSeedPaper && !matchedPrompt && !checkLoading && (
                    <>
                      <AddGroundTruthCard
                        matchedSeedPaper={matchedSeedPaper}
                        groundTruthFile={groundTruthFile}
                        setGroundTruthFile={setGroundTruthFile}
                        groundTruthInputRef={groundTruthInputRef}
                        groundTruthReferences={groundTruthReferences}
                        addGroundTruthLoading={addGroundTruthLoading}
                        onAddGroundTruth={handleAddGroundTruth}
                      />
                      <AddPromptCard
                        parsedMeta={parsedMeta}
                        matchedSeedPaper={matchedSeedPaper}
                        addPromptAlias={addPromptAlias}
                        setAddPromptAlias={setAddPromptAlias}
                        addPromptVersion={addPromptVersion}
                        setAddPromptVersion={setAddPromptVersion}
                        addPromptContent={addPromptContent}
                        setAddPromptContent={setAddPromptContent}
                        addPromptFile={addPromptFile}
                        setAddPromptFile={setAddPromptFile}
                        addPromptFileInputRef={addPromptFileInputRef}
                        addPromptLoading={addPromptLoading}
                        onAddPrompt={handleAddPromptToDb}
                      />
                    </>
                  )}
                </>
              )}

              <div className="alert alert-light border small">
                <strong>Filename format:</strong>
                <code className="d-block mt-1 mb-1">{FILENAME_PATTERN}.json | .bib | .txt</code>
                <span className="text-muted">Example: </span>
                <code>{EXAMPLE_FILENAME}</code>
                <p className="mt-2 mb-0 text-muted">
                  Comment is optional. Use <code>.json</code> or <code>.bib</code> for publication lists; use <code>_na.txt</code> for no-result runs (execution stored with 0 publications; file content saved as execution comment if present).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canAddToDb}
                onClick={handleAddToDb}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Importing…
                  </>
                ) : (
                  <>
                    <i className="fas fa-database me-2"></i>
                    Add to DB
                  </>
                )}
              </button>
              {files.length > 0 && !canAddToDb && !loading && (
                <p className="small text-muted mt-2 mb-0">
                  {isMultiFile
                    ? uploadableFiles.length === 0
                      ? 'Select at least one .json, .bib, or .txt file.'
                      : null
                    : !parsedMeta
                      ? 'Use a valid filename format.'
                      : checkLoading
                        ? 'Checking…'
                        : !matchedSeedPaper
                          ? 'Add the seed paper above first.'
                          : !matchedPrompt
                            ? 'Add the prompt above first.'
                            : null}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-12">
          <ImportHistoryList importHistory={importHistory} onClearHistory={handleClearHistory} />
        </div>
      </div>
    </div>
  );
}
