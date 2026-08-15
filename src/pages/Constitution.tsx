import React, { useState } from 'react';
import { useConstitutionSearch } from '../hooks/useConstitution';
import type { ConstitutionSection, ConstitutionClause } from '../types';
import { usePageView } from '../hooks/useAnalytics';

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 30%, transparent)', color: 'inherit', borderRadius: '2px', padding: '0 2px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function ClauseItem({ clause, searchTerm }: { clause: ConstitutionClause; searchTerm: string }) {
  const subClauses = clause.subClauses || (clause as any).sub_clauses || [];

  return (
    <div className="py-3 first:pt-0 last:pb-0" style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
      <div className="flex gap-3">
        <span
          className="text-xs font-bold mt-0.5 flex-shrink-0 px-2 py-0.5 rounded-md"
          style={{
            color: 'var(--color-accent-gold)',
            backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 10%, transparent)',
          }}
        >
          {clause.number}
        </span>
        <div className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {searchTerm ? highlightText(clause.text, searchTerm) : clause.text}
        </div>
      </div>
      {subClauses.length > 0 && (
        <div className="ml-10 mt-2 space-y-1.5">
          {subClauses.map((sc: any, i: number) => (
            <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span
                className="text-xs font-semibold flex-shrink-0 mt-0.5"
                style={{ color: 'var(--color-accent-teal)' }}
              >
                ({sc.letter})
              </span>
              <span>{searchTerm ? highlightText(sc.text, searchTerm) : sc.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NarrativeSection({ section, searchTerm }: { section: ConstitutionSection; searchTerm: string }) {
  const paragraphs = section.paragraphs || [];
  const content = section.content || '';

  if (paragraphs.length > 0) {
    return (
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {paragraphs.map((p, i) => (
          <p key={i}>{searchTerm ? highlightText(p, searchTerm) : p}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
      {searchTerm ? highlightText(content, searchTerm) : content}
    </div>
  );
}

export default function Constitution() {
  usePageView('constitution');
  const [expandedSection, setExpandedSection] = useState<string | null>('foundation_history');
  const [searchTerm, setSearchTerm] = useState('');
  const { sections, meta, loading, error } = useConstitutionSearch(searchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse" style={{ color: 'var(--color-text-secondary)' }}>Loading constitution...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ color: 'var(--color-text-muted)' }}>Could not load constitution data.</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-[Outfit] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          📜 Constitution
        </h1>
        {meta && (
          <>
            <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {meta.title}
            </p>
            <p className="text-xs mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>
              {meta.subtitle}
            </p>
          </>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search the Constitution..."
          className="w-full rounded-xl px-4 py-3 text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          }}
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 p-4 text-left transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="flex-1 font-semibold text-sm font-[Outfit]">
                  {section.title}
                </span>
                {section.type === 'clauses' && section.clauses && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)',
                  }}>
                    {section.clauses.length}
                  </span>
                )}
                <span
                  className="text-lg transition-transform duration-200"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: 'var(--color-accent-teal)',
                  }}
                >
                  ▾
                </span>
              </button>

              {isExpanded && (
                <div
                  className="px-4 pb-4 animate-fade-in"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <div className="pt-4">
                    {section.type === 'narrative' ? (
                      <NarrativeSection section={section} searchTerm={searchTerm} />
                    ) : section.clauses ? (
                      <div className="space-y-0">
                        {section.clauses.map((clause, i) => (
                          <ClauseItem key={i} clause={clause} searchTerm={searchTerm} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No sections found matching "{searchTerm}"
        </div>
      )}

      {/* Footer note */}
      {meta?.note && (
        <div
          className="mt-8 p-4 rounded-xl text-xs text-center"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          {meta.note}
        </div>
      )}
    </div>
  );
}
