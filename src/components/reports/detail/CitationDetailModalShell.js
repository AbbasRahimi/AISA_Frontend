import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './CitationDetailModalShell.css';

export const REPORTS_CITATIONS_TABLE_ID = 'reports-citations-table';

const VIEWPORT_MARGIN = 16;
const MIN_DIALOG_HEIGHT = 240;
const XL_WIDTH = 1140;

function measurePlacement() {
  const table = document.getElementById(REPORTS_CITATIONS_TABLE_ID);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(XL_WIDTH, Math.max(280, vw - VIEWPORT_MARGIN * 2));
  const maxHeight = Math.max(MIN_DIALOG_HEIGHT, vh - VIEWPORT_MARGIN * 2);

  const rect = table?.getBoundingClientRect();
  let top = rect ? rect.top : VIEWPORT_MARGIN;
  if (top + maxHeight > vh - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN - maxHeight);
  }
  top = Math.min(Math.max(VIEWPORT_MARGIN, top), vh - VIEWPORT_MARGIN - MIN_DIALOG_HEIGHT);

  let left;
  if (rect) {
    left = rect.left + rect.width / 2 - width / 2;
  } else {
    left = (vw - width) / 2;
  }
  left = Math.min(Math.max(VIEWPORT_MARGIN, left), vw - width - VIEWPORT_MARGIN);

  return { top, left, width, maxHeight };
}

export default function CitationDetailModalShell({ onClose, children }) {
  const [placement, setPlacement] = useState(() => measurePlacement());

  useLayoutEffect(() => {
    const table = document.getElementById(REPORTS_CITATIONS_TABLE_ID);
    table?.scrollIntoView({ block: 'nearest' });
    const frame = window.requestAnimationFrame(() => setPlacement(measurePlacement()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const onResize = () => setPlacement(measurePlacement());
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="citation-detail-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="citation-detail-modal-dialog modal-dialog modal-xl modal-dialog-scrollable"
        role="dialog"
        aria-modal="true"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
          maxWidth: placement.width,
          maxHeight: placement.maxHeight,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
