from typing import List, Dict, Any


def build_prompt(question: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Build a strictly-grounded RAG prompt from the user question and retrieved context chunks.
    Injects verifiable file, page number, and section heading citations.
    Instructs the LLM to refuse claims not supported by the context to prevent hallucinations.
    """
    if not context_chunks:
        context = "No relevant document excerpts were found for this query."
    else:
        sections = []
        for i, chunk in enumerate(context_chunks, 1):
            filename = chunk.get("filename", "Document")
            page = chunk.get("page_number", 1)
            section_title = chunk.get("section_title", "General")
            text = chunk.get("text", "").strip()
            sections.append(
                f"[Source {i} | File: {filename} | Page: {page} | Section: {section_title}]\n{text}"
            )
        context = "\n\n---\n\n".join(sections)

    sample_cite = f"[{context_chunks[0].get('filename', 'document') if context_chunks else 'document'}, Page {context_chunks[0].get('page_number', 1) if context_chunks else 1}]"
    prompt = f"""You are DocuMind AI, an expert, precision-driven document intelligence assistant.
Your goal is to answer the user's question accurately, strictly using ONLY the factual evidence provided in the Context below.

GROUNDING & CITATION RULES:
1. Answer EXCLUSIVELY using the facts explicitly stated in the Context below (including the verified Section titles and Page numbers in the [Source] headers).
2. If the answer cannot be determined or verified from the Context, state clearly:
   "Based on the provided documents, I could not find sufficient information to answer this question."
   Do NOT extrapolate, speculate, or draw on outside knowledge.
3. INLINE CITATIONS: Every factual claim, recommendation, or answer item MUST cite its source using inline bracket citations (e.g. `{sample_cite}`).
4. DEDUPLICATION & CONCISENESS:
   - State each factual point or key recommendation ONLY ONCE. Do NOT repeat identical bullet points under different headings.
   - If the same facts appear across multiple sources, cite ONLY the primary source (e.g. `{sample_cite}`) and do not generate duplicate sections.
   - Distinct citations should only be used when different pages provide genuinely distinct information.
5. Maintain a clear, professional, and well-structured response with Markdown formatting (bullet points, bold highlights).

## Context:
{context}

## Question:
{question}

## Answer:
"""
    return prompt
