import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

STORAGE_BASE = "http://localhost:18080/api/storage"


class PersistRequest:
    def __init__(self, entity: str, content: str | None = None):
        self.entity = entity
        self.content = content


async def _read_json(entity: str) -> dict | None:
    """Read JSON data from storage."""
    path = f"{entity}.json"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{STORAGE_BASE}/read", params={"path": path})
            if resp.status_code == 404:
                return None
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to read {entity}")
            data = resp.json()
            if data.get("content"):
                import json
                return json.loads(data["content"])
            return None
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Storage service unavailable")


async def _write_json(entity: str, data: dict) -> None:
    """Write JSON data to storage."""
    import json
    path = f"{entity}.json"
    content = json.dumps(data, ensure_ascii=False, indent=2)
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{STORAGE_BASE}/write",
                params={"path": path},
                json={"content": content},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to write {entity}")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Storage service unavailable")


# Entity list for bulk operations
ENTITIES = [
    "workspaces",
    "novels",
    "knowledge",
    "production",
    "storyboard",
    "audio_tracks",
    "timeline",
    "scripts",
    "reviews",
]


@router.get("/entities")
async def list_entities() -> dict:
    """List all available persist entities."""
    return {"entities": ENTITIES}


@router.get("/{entity}")
async def get_entity(entity: str) -> dict:
    """Get persisted data for an entity."""
    if entity not in ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity: {entity}")
    data = await _read_json(entity)
    if data is None:
        return {"status": "ok", "data": None, "message": "No data yet"}
    return {"status": "ok", "data": data}


@router.post("/{entity}")
async def save_entity(entity: str, data: dict) -> dict:
    """Save data for an entity."""
    if entity not in ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity: {entity}")
    await _write_json(entity, data)
    return {"status": "ok", "entity": entity}


@router.get("/")
async def get_all() -> dict:
    """Get all persisted data."""
    result = {}
    for entity in ENTITIES:
        data = await _read_json(entity)
        result[entity] = data
    return {"status": "ok", "data": result}
