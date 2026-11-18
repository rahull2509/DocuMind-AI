# DocuMind AI — API Documentation

## Base URL

```
http://localhost:8000
```

All endpoints are prefixed with `/api`. The interactive Swagger UI is available at:

```
http://localhost:8000/docs
```

## Authentication

**None in v1.** DocuMind AI is a localhost-only application. No tokens, API keys, or session cookies are required. It is **strongly recommended** not to expose the backend port to public networks.

## Content Types

| Direction | Content-Type |
|-----------|-------------|
| JSON request bodies | `application/json` |
| File uploads | `multipart/form-data` |
| Streaming responses | `text/event-stream` (SSE) |
| Standard responses | `application/json` |

## Error Format

All error responses follow this shape:

```json
{
  "detail": "Human-readable error message"
}
```

---

## Endpoints

---

### GET /api/health

Health check. Returns the operational status of the backend and its dependencies.

**Response `200 OK`**

```json
{
  "status": "ok",
  "ollama": true,
  "chroma": true,
  "database": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` when the backend is up |
| `ollama` | boolean | Whether Ollama is reachable |
| `chroma` | boolean | Whether ChromaDB collection is accessible |
| `database` | boolean | Whether the SQLite connection is healthy |

**Example**

```bash
curl http://localhost:8000/api/health
```

---

### POST /api/documents/upload

Upload a PDF document. The backend saves the file, ingests it through the RAG pipeline (extract → chunk → embed → store), and returns the new document record.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | ✅ | A `.pdf` file. Max size controlled by `MAX_FILE_SIZE_MB` (default 20 MB). |

**Response `201 Created`**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "filename": "annual_report_2024.pdf",
  "original_filename": "Annual Report 2024.pdf",
  "file_size": 1048576,
  "page_count": 42,
  "chunk_count": 134,
  "status": "ready",
  "created_at": "2024-11-18T06:11:42Z",
  "updated_at": "2024-11-18T06:11:55Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique document identifier |
| `filename` | string | Sanitized filename used for storage |
| `original_filename` | string | Filename as uploaded by the user |
| `file_size` | integer | File size in bytes |
| `page_count` | integer | Total pages extracted from the PDF |
| `chunk_count` | integer | Total text chunks indexed in ChromaDB |
| `status` | string | `uploading` → `ready` or `error` |
| `created_at` | string (ISO 8601) | Creation timestamp |
| `updated_at` | string (ISO 8601) | Last update timestamp |

**Error Responses**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | File is not a PDF, exceeds size limit, or is image-only (no extractable text) |
| `422 Unprocessable Entity` | Missing `file` field |
| `500 Internal Server Error` | Embedding or ChromaDB failure |

**Example**

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/document.pdf"
```

---

### GET /api/documents

List all uploaded documents, ordered by creation date descending.

**Query Parameters** — None

**Response `200 OK`**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "filename": "annual_report_2024.pdf",
    "original_filename": "Annual Report 2024.pdf",
    "file_size": 1048576,
    "page_count": 42,
    "chunk_count": 134,
    "status": "ready",
    "created_at": "2024-11-18T06:11:42Z",
    "updated_at": "2024-11-18T06:11:55Z"
  }
]
```

Returns an array of Document objects (same schema as `/upload` response).

**Example**

```bash
curl http://localhost:8000/api/documents
```

---

### GET /api/documents/{id}

Retrieve a single document by its UUID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Document ID |

**Response `200 OK`**

Same schema as the Document object above.

**Error Responses**

| Status | Description |
|--------|-------------|
| `404 Not Found` | No document with the given ID |

**Example**

```bash
curl http://localhost:8000/api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

---

### DELETE /api/documents/{id}

Delete a document and all associated data: the PDF file on disk, its vectors in ChromaDB, and its metadata record in SQLite.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Document ID |

**Response `204 No Content`** — Empty body on success.

**Error Responses**

| Status | Description |
|--------|-------------|
| `404 Not Found` | No document with the given ID |
| `500 Internal Server Error` | Failure deleting vectors or file |

**Example**

```bash
curl -X DELETE http://localhost:8000/api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

---

### POST /api/chat/stream

Send a user message and receive a streamed LLM response as Server-Sent Events (SSE).

**Request Body** — `application/json`

```json
{
  "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "message": "What were the key financial highlights in 2024?",
  "document_ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | string (UUID) | ✅ | Conversation to append the message to |
| `message` | string | ✅ | The user's question |
| `document_ids` | array of string | ❌ | Scope retrieval to specific documents. If omitted or empty, all documents are searched. |

**Response `200 OK`** — `text/event-stream` (SSE)

Each SSE event has `data:` followed by a JSON object. There are three event types:

**Token event** (emitted for each streamed token):

```
data: {"type": "token", "content": "The "}
data: {"type": "token", "content": "key "}
data: {"type": "token", "content": "highlights..."}
```

**Sources event** (emitted once after all tokens, before `done`):

```
data: {"type": "sources", "sources": [{"document_id": "3fa85f64...", "filename": "annual_report_2024.pdf", "page_number": 7, "chunk_index": 2, "distance": 0.142}]}
```

**Done event** (signals end of stream):

```
data: {"type": "done"}
```

**Error event** (if an error occurs mid-stream):

```
data: {"type": "error", "message": "Ollama connection refused"}
```

**Error Responses** (before stream opens)

| Status | Description |
|--------|-------------|
| `404 Not Found` | Conversation ID does not exist |
| `422 Unprocessable Entity` | Missing required fields |
| `503 Service Unavailable` | Ollama is not reachable |

**Example**

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/api/chat/stream \
  -d '{"conversation_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","message":"Summarize the introduction","document_ids":["3fa85f64-5717-4562-b3fc-2c963f66afa6"]}'
```

---

### GET /api/conversations

List all conversations, ordered by `updated_at` descending.

**Response `200 OK`**

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "title": "Annual Report Analysis",
    "created_at": "2024-11-18T06:00:00Z",
    "updated_at": "2024-11-18T06:15:00Z",
    "message_count": 6
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Conversation identifier |
| `title` | string | Display name |
| `created_at` | string (ISO 8601) | |
| `updated_at` | string (ISO 8601) | |
| `message_count` | integer | Total messages in this conversation |

**Example**

```bash
curl http://localhost:8000/api/conversations
```

---

### POST /api/conversations

Create a new, empty conversation.

**Request Body** — `application/json`

```json
{
  "title": "New Chat"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ❌ | Display name. Defaults to `"New Chat"` if omitted. |

**Response `201 Created`**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "New Chat",
  "created_at": "2024-11-18T06:00:00Z",
  "updated_at": "2024-11-18T06:00:00Z",
  "message_count": 0
}
```

**Example**

```bash
curl -X POST http://localhost:8000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Chat"}'
```

---

### GET /api/conversations/{id}

Retrieve a conversation and its full message history.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Conversation ID |

**Response `200 OK`**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Annual Report Analysis",
  "created_at": "2024-11-18T06:00:00Z",
  "updated_at": "2024-11-18T06:15:00Z",
  "messages": [
    {
      "id": "a1b2c3d4-...",
      "role": "user",
      "content": "What were the key financial highlights?",
      "sources": null,
      "created_at": "2024-11-18T06:10:00Z"
    },
    {
      "id": "e5f6a7b8-...",
      "role": "assistant",
      "content": "The key financial highlights in 2024 were...",
      "sources": [
        {
          "document_id": "3fa85f64-...",
          "filename": "annual_report_2024.pdf",
          "page_number": 7
        }
      ],
      "created_at": "2024-11-18T06:10:12Z"
    }
  ]
}
```

**Error Responses**

| Status | Description |
|--------|-------------|
| `404 Not Found` | No conversation with the given ID |

**Example**

```bash
curl http://localhost:8000/api/conversations/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

### PATCH /api/conversations/{id}

Rename a conversation.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Conversation ID |

**Request Body** — `application/json`

```json
{
  "title": "Q4 2024 Deep Dive"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | New display name |

**Response `200 OK`** — Updated Conversation object (without messages).

**Error Responses**

| Status | Description |
|--------|-------------|
| `404 Not Found` | Conversation not found |
| `422 Unprocessable Entity` | Missing `title` field |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/conversations/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Content-Type: application/json" \
  -d '{"title": "Q4 2024 Deep Dive"}'
```

---

### DELETE /api/conversations/{id}

Delete a conversation and all its messages (cascade).

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Conversation ID |

**Response `204 No Content`** — Empty body on success.

**Error Responses**

| Status | Description |
|--------|-------------|
| `404 Not Found` | Conversation not found |

**Example**

```bash
curl -X DELETE http://localhost:8000/api/conversations/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

### GET /api/settings

Retrieve the current application configuration (read-only). Useful for the frontend to discover the active model, chunk size, and other runtime settings.

**Response `200 OK`**

```json
{
  "ollama_url": "http://localhost:11434",
  "ollama_model": "qwen2.5:3b",
  "embedding_model": "BAAI/bge-small-en-v1.5",
  "chunk_size": 2800,
  "chunk_overlap": 400,
  "top_k": 5,
  "max_file_size_mb": 20,
  "temperature": 0.1,
  "max_tokens": 2048
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ollama_url` | string | Active Ollama endpoint |
| `ollama_model` | string | LLM model in use |
| `embedding_model` | string | Sentence-transformer model in use |
| `chunk_size` | integer | Max characters per chunk |
| `chunk_overlap` | integer | Overlap between chunks in characters |
| `top_k` | integer | Chunks retrieved per query |
| `max_file_size_mb` | integer | Upload size limit in MB |
| `temperature` | float | LLM sampling temperature |
| `max_tokens` | integer | Max tokens per LLM response |

**Example**

```bash
curl http://localhost:8000/api/settings
```

---

### GET /api/models

List all locally available Ollama models. Proxies Ollama's model list.

**Response `200 OK`**

```json
{
  "models": [
    {
      "name": "qwen2.5:3b",
      "size": 1930000000,
      "modified_at": "2024-11-10T08:00:00Z"
    },
    {
      "name": "llama3.2:3b",
      "size": 2020000000,
      "modified_at": "2024-11-12T12:30:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `models` | array | List of available Ollama models |
| `models[].name` | string | Model tag (e.g. `qwen2.5:3b`) |
| `models[].size` | integer | Model size in bytes |
| `models[].modified_at` | string (ISO 8601) | When the model was last pulled |

**Error Responses**

| Status | Description |
|--------|-------------|
| `503 Service Unavailable` | Ollama is not running or not reachable at the configured URL |

**Example**

```bash
curl http://localhost:8000/api/models
```

---

## SSE Client Example (JavaScript)

```javascript
const response = await fetch('http://localhost:8000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversation_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    message: 'Summarize the key findings',
    document_ids: ['3fa85f64-5717-4562-b3fc-2c963f66afa6']
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));

    if (event.type === 'token') {
      process.stdout.write(event.content);
    } else if (event.type === 'sources') {
      console.log('\nSources:', event.sources);
    } else if (event.type === 'done') {
      break;
    } else if (event.type === 'error') {
      console.error('Stream error:', event.message);
    }
  }
}
```
