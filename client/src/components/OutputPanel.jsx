import React from 'react';
import '../styles/OutputPanel.css';

const OutputPanel = ({ output, isExecuting, onClear, onCopy, executionDetails, isVisible }) => {
  const formatOutput = (output) => {
    if (!output) return [];

    const lines = output.split('\n');
    const formattedLines = [];

    lines.forEach((line, index) => {
      let className = 'output-line output';

      if (line.includes('✅') || line.includes('Execution completed successfully')) {
        className = 'output-line success';
      } else if (line.includes('❌') || line.includes('Error:') || line.includes('🚨')) {
        className = 'output-line error';
      } else if (line.includes('⚠️') || line.includes('Warning:')) {
        className = 'output-line warning';
      } else if (line.includes('📤 Partial output:')) {
        className = 'output-line separator';
      } else if (line.includes('🚀') || line.includes('Executing')) {
        className = 'output-line info';
      } else if (line.includes('ms') || line.includes('MB')) {
        className = 'output-line timestamp';
      }

      formattedLines.push({
        id: index,
        text: line,
        className,
      });
    });

    return formattedLines;
  };

  const getStatusInfo = () => {
    if (isExecuting) {
      return {
        icon: '⚡',
        text: 'RUNNING',
        className: 'running',
      };
    }

    if (!output) {
      return {
        icon: '💻',
        text: 'READY',
        className: 'success',
      };
    }

    if (output.includes('❌') || output.includes('Error:')) {
      return {
        icon: '❌',
        text: 'ERROR',
        className: 'error',
      };
    }

    return {
      icon: '✅',
      text: 'SUCCESS',
      className: 'success',
    };
  };

  const statusInfo = getStatusInfo();
  const formattedLines = formatOutput(output);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`output-panel ${!isVisible ? 'hidden' : ''}`}>
      <div className="output-header">
        <div className="output-header-left">
          <span className="output-icon">📊</span>
          <span className="output-title">OUTPUT</span>
          <div className={`output-status ${statusInfo.className}`}>
            <span>{statusInfo.icon}</span>
            <span>{statusInfo.text}</span>
          </div>
        </div>

        <div className="output-actions">
          {output && (
            <>
              <button className="output-action-btn" onClick={onCopy} title="Copy output">
                📋
              </button>
              <button className="output-action-btn" onClick={onClear} title="Clear output">
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      <div className="output-split-container">
        {/* Left Panel - Code Output */}
        <div className="output-left-panel">
          <div className="output-content">
            {isExecuting ? (
              <div className="output-loading">
                <div className="spinner"></div>
                <span>Executing code...</span>
              </div>
            ) : !output ? (
              <div className="output-empty">
                <span>No output yet. Run your code to see results here.</span>
              </div>
            ) : (
              formattedLines.map((line) => (
                <div key={line.id} className={line.className}>
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Execution Details */}
        <div className="output-right-panel">
          <div className="execution-details">
            <div className="detail-section">
              <div className="detail-section-title">Execution Info</div>
              <div className="detail-item">
                <span className="detail-label">File:</span>
                <span className="detail-value">{executionDetails?.fileName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Language:</span>
                <span className="detail-value">{executionDetails?.language || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value ${statusInfo.className}`}>{statusInfo.text}</span>
              </div>
            </div>

            {executionDetails && (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Performance</div>
                  <div className="execution-metrics">
                    <div className="metric-card">
                      <div className="metric-value">{executionDetails.executionTime || 'N/A'}</div>
                      <div className="metric-label">Time (ms)</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{executionDetails.memoryUsed || 'N/A'}</div>
                      <div className="metric-label">Memory (MB)</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Details</div>
                  {executionDetails.error && (
                    <div className="detail-item">
                      <span className="detail-label">Error:</span>
                      <span className="detail-value error">{executionDetails.error}</span>
                    </div>
                  )}
                  {executionDetails.warnings && (
                    <div className="detail-item">
                      <span className="detail-label">Warnings:</span>
                      <span className="detail-value warning">{executionDetails.warnings}</span>
                    </div>
                  )}
                  {executionDetails.timestamp && (
                    <div className="detail-item">
                      <span className="detail-label">Executed:</span>
                      <span className="detail-value timestamp">{executionDetails.timestamp}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;
