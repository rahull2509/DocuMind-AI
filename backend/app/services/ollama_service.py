import json
from typing import AsyncGenerator, List, Optional
import httpx


async def check_health(url: str) -> bool:
    """Check if Ollama server is reachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{url}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


async def list_models(url: str) -> List[str]:
    """Return list of available model names from Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{url}/api/tags")
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])
            return [m["name"] for m in models if "name" in m]
    except Exception:
        return []


async def generate_stream(
    url: str,
    model: str,
    prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from Ollama generate endpoint.
    Yields the 'response' field from each NDJSON line.
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{url}/api/generate",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
    except httpx.ConnectError as exc:
        raise ConnectionError(f"Cannot connect to Ollama at {url}: {exc}") from exc
    except httpx.TimeoutException as exc:
        raise TimeoutError(f"Ollama request timed out: {exc}") from exc
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"Ollama returned error {exc.response.status_code}") from exc
