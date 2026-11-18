import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SourceCard } from '@/components/sources/SourceCard';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatus';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { StreamingIndicator } from '@/components/chat/StreamingIndicator';
import { formatFileSize, formatRelativeTime, formatDate, formatMessageTime, parseDate, truncate } from '@/lib/utils';

describe('Utility Functions', () => {
  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
  });

  it('formats relative time strings safely', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('parses naive ISO strings as UTC and formats local time accurately', () => {
    const date = parseDate('2026-11-18T06:58:00');
    expect(date.getUTCHours()).toBe(6);
    expect(date.getUTCMinutes()).toBe(58);
    // formatMessageTime returns a valid formatted string
    expect(formatMessageTime('2026-11-18T06:58:00')).toBeTruthy();
  });

  it('truncates strings properly', () => {
    expect(truncate('Hello world', 5)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });
});

describe('SourceCard Component', () => {
  it('renders citation filename, page number, and text', () => {
    const mockSource = {
      filename: 'sample_financial_report.pdf',
      page_number: 3,
      chunk_index: 0,
      text: 'Total revenue grew by 18% year-over-year according to Q3 metrics.',
      distance: 0.15,
    };

    render(<SourceCard source={mockSource} index={0} />);

    expect(screen.getByText('sample_financial_report.pdf')).toBeInTheDocument();
    expect(screen.getByText('p. 3')).toBeInTheDocument();
    expect(screen.getByText(/Total revenue grew by 18%/i)).toBeInTheDocument();
    expect(screen.getByText('85% match')).toBeInTheDocument();
  });
});

describe('DocumentStatusBadge Component', () => {
  it('renders Ready badge for completed status', () => {
    render(<DocumentStatusBadge status="completed" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders Indexing badge for processing status', () => {
    render(<DocumentStatusBadge status="processing" />);
    expect(screen.getByText('Indexing')).toBeInTheDocument();
  });

  it('renders Failed badge for failed status', () => {
    render(<DocumentStatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});

describe('ChatEmptyState Component', () => {
  it('renders title and triggers callback when prompt clicked', () => {
    const onSelect = vi.fn();
    render(<ChatEmptyState onSelectPrompt={onSelect} />);

    expect(screen.getByText('What would you like to explore?')).toBeInTheDocument();
    const promptButton = screen.getByText('Summarize documents');
    fireEvent.click(promptButton);
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('StreamingIndicator Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<StreamingIndicator />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
