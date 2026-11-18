def build_prompt(question: str, context_chunks: list[dict]) -> str:
    """
    Build a RAG prompt from the question and retrieved context chunks.
    """
    if not context_chunks:
        context = "No relevant documents were found."
    else:
        sections = []
        for i, chunk in enumerate(context_chunks, 1):
            filename = chunk.get("filename", "Unknown")
            page = chunk.get("page_number", "?")
            text = chunk.get("text", "")
            sections.append(f"[Source {i} — {filename}, page {page}]\n{text}")
        context = "\n\n---\n\n".join(sections)

    prompt = f"""You are DocuMind AI, a helpful assistant that answers questions based on the provided document context.

Use ONLY the information from the context below to answer the question. If the answer is not in the context, say so clearly.
Cite the source file and page number when relevant.

## Context

{context}

## Question

{question}

## Answer
"""
    return prompt
