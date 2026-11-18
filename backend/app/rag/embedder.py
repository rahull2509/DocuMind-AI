import threading
from typing import List
from sentence_transformers import SentenceTransformer
from app.config import settings


class Embedder:
    def __init__(self, model_name: str):
        self._model = SentenceTransformer(model_name)
        self._lock = threading.Lock()

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts. Returns normalized embeddings."""
        with self._lock:
            embeddings = self._model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return embeddings.tolist()


_embedder_instance: Embedder | None = None
_embedder_lock = threading.Lock()


def get_embedder() -> Embedder:
    """Return the singleton Embedder instance (thread-safe)."""
    global _embedder_instance
    if _embedder_instance is None:
        with _embedder_lock:
            if _embedder_instance is None:
                _embedder_instance = Embedder(settings.EMBEDDING_MODEL)
    return _embedder_instance
