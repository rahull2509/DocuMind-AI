import pytest
from unittest.mock import MagicMock, patch
import numpy as np


def test_embedder_returns_list_of_floats():
    """Test that embed() returns list[list[float]]."""
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])

    with patch("app.rag.embedder.SentenceTransformer", return_value=mock_model):
        from app.rag import embedder as embedder_module
        # Reset singleton
        embedder_module._embedder_instance = None

        with patch("app.rag.embedder.settings") as mock_settings:
            mock_settings.EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
            embedder_module._embedder_instance = None
            inst = embedder_module.Embedder("BAAI/bge-small-en-v1.5")
            inst._model = mock_model

            result = inst.embed(["hello", "world"])
            assert isinstance(result, list)
            assert len(result) == 2
            assert isinstance(result[0], list)
            assert isinstance(result[0][0], float)


def test_embedder_normalize_called():
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3]])

    with patch("app.rag.embedder.SentenceTransformer", return_value=mock_model):
        from app.rag.embedder import Embedder
        inst = Embedder("BAAI/bge-small-en-v1.5")
        inst._model = mock_model
        inst.embed(["test"])
        mock_model.encode.assert_called_once()
        call_kwargs = mock_model.encode.call_args
        assert call_kwargs.kwargs.get("normalize_embeddings") is True


def test_get_embedder_singleton():
    """get_embedder() must return the same instance."""
    with patch("app.rag.embedder.SentenceTransformer"):
        import app.rag.embedder as embedder_module
        embedder_module._embedder_instance = None

        with patch("app.rag.embedder.settings") as ms:
            ms.EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
            e1 = embedder_module.get_embedder()
            e2 = embedder_module.get_embedder()
            assert e1 is e2
        embedder_module._embedder_instance = None


def test_embed_empty_list():
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([]).reshape(0, 384)

    from app.rag.embedder import Embedder
    inst = Embedder.__new__(Embedder)
    inst._model = mock_model
    import threading
    inst._lock = threading.Lock()
    result = inst.embed([])
    assert result == []


def test_embed_single_text():
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([[0.5, 0.5]])

    from app.rag.embedder import Embedder
    import threading
    inst = Embedder.__new__(Embedder)
    inst._model = mock_model
    inst._lock = threading.Lock()
    result = inst.embed(["single"])
    assert len(result) == 1
    assert result[0] == [0.5, 0.5]
