/**
 * PDF Generator Module
 * Handles automatic PDF download of assignment pages
 */

(function() {
  'use strict';

  /**
   * Sanitizes filename by removing/replacing invalid characters
   * @param {string} filename - The original filename
   * @returns {string} - Sanitized filename
   */
  function sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 200) || 'assignment';
  }

  /**
   * Gets the assignment title from the input field
   * @returns {string} - The sanitized assignment title
   */
  function getAssignmentTitle() {
    const titleInput = document.getElementById('customTitle');
    const title = titleInput ? titleInput.value.trim() : '';
    return sanitizeFilename(title || 'Assignment');
  }

  /**
   * Prepares the content for PDF generation
   * Clones the output section and adjusts for print
   * @returns {HTMLElement|null} - The prepared content element
   */
  function getPdfContent() {
    const outputDiv = document.getElementById('output');

    if (!outputDiv || !outputDiv.innerHTML.trim()) {
      alert('No assignment content to download. Please generate an assignment first.');
      return null;
    }

    const clone = outputDiv.cloneNode(true);
    clone.style.display = 'block';
    clone.style.padding = '20px';
    clone.style.backgroundColor = 'white';

    return clone;
  }

  /**
   * Shows a loading indicator during PDF generation
   */
  function showLoadingIndicator() {
    const btn = document.getElementById('downloadPdfBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Generating PDF...
      `;
    }
  }

  /**
   * Resets the download button to its original state
   */
  function resetDownloadButton() {
    const btn = document.getElementById('downloadPdfBtn');
    if (btn) {
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download PDF
      `;
      updateButtonState();
    }
  }

  /**
   * Waits for MathJax to finish rendering before generating PDF
   * @returns {Promise} - Resolves when MathJax is ready
   */
  function waitForMathJax() {
    return new Promise((resolve) => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().then(resolve).catch(resolve);
      } else {
        setTimeout(resolve, 100);
      }
    });
  }

  /**
   * Main function to generate and download PDF
   */
  async function generatePDF() {
    try {
      showLoadingIndicator();

      const content = getPdfContent();
      if (!content) {
        resetDownloadButton();
        return;
      }

      await waitForMathJax();

      const filename = `${getAssignmentTitle()}.pdf`;

      const opt = {
        margin: [15, 15, 15, 15],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.no-break'
        }
      };

      await html2pdf().set(opt).from(content).save();

      resetDownloadButton();

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again or contact support if the issue persists.');
      resetDownloadButton();
    }
  }

  /**
   * Checks if output div has content
   * @returns {boolean} - True if content exists
   */
  function hasAssignmentContent() {
    const outputDiv = document.getElementById('output');
    return outputDiv && outputDiv.innerHTML.trim().length > 0;
  }

  /**
   * Updates button state based on content availability
   */
  function updateButtonState() {
    const btn = document.getElementById('downloadPdfBtn');
    if (!btn) return;

    if (hasAssignmentContent()) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.title = 'Download assignment as PDF';
    } else {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = 'Generate an assignment first';
    }
  }

  /**
   * Sets up observer to watch for changes in output div
   */
  function setupContentObserver() {
    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;

    const observer = new MutationObserver(() => {
      updateButtonState();
    });

    observer.observe(outputDiv, {
      childList: true,
      subtree: true,
      characterData: true
    });

    updateButtonState();
  }

  /**
   * Initialize PDF download functionality
   */
  function initPdfDownload() {
    const downloadBtn = document.getElementById('downloadPdfBtn');

    if (downloadBtn) {
      downloadBtn.addEventListener('click', generatePDF);
      updateButtonState();
    }

    setupContentObserver();

    if (typeof window !== 'undefined') {
      window.generatePDF = generatePDF;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPdfDownload);
  } else {
    initPdfDownload();
  }

})();
