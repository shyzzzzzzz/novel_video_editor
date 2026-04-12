import logging
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.sync")

router = APIRouter()

GITHUB_API = "https://api.github.com"


class SyncPushRequest(BaseModel):
    gist_id: str
    filename: str
    content: str


class SyncPushResponse(BaseModel):
    status: str
    gist_url: str


class SyncPullResponse(BaseModel):
    status: str
    content: str | None
    updated_at: str | None


class GistFile(BaseModel):
    filename: str
    content: str


@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    req: SyncPushRequest,
    authorization: str = Header(None, alias="Authorization"),
):
    """
    Push workspace data to a GitHub Gist.
    Uses the Gist ID to update an existing Gist (requires the Gist ID).
    Creates if gist_id is new.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    # Try to update existing Gist
    async with httpx.AsyncClient(timeout=30.0) as client:
        # First check if gist exists
        try:
            resp = await client.get(
                f"{GITHUB_API}/gists/{req.gist_id}",
                headers=headers,
            )
            if resp.status_code == 200:
                # Update existing gist
                update_payload = {
                    "description": f"VibeStudio Workspace Sync - {req.filename}",
                    "files": {
                        req.filename: {"content": req.content}
                    },
                }
                resp = await client.patch(
                    f"{GITHUB_API}/gists/{req.gist_id}",
                    headers=headers,
                    json=update_payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return SyncPushResponse(
                        status="updated",
                        gist_url=data.get("html_url", ""),
                    )
        except httpx.RequestError as e:
            logger.error(f"Gist update request failed: {e}")
            raise HTTPException(status_code=502, detail=f"Gist API error: {e}")

    # Create new gist if update failed
    create_payload = {
        "description": f"VibeStudio Workspace - {req.filename}",
        "public": False,
        "files": {
            req.filename: {"content": req.content}
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{GITHUB_API}/gists",
                headers=headers,
                json=create_payload,
            )
            if resp.status_code == 201:
                data = resp.json()
                return SyncPushResponse(
                    status="created",
                    gist_url=data.get("html_url", ""),
                )
            else:
                logger.error(f"Gist create failed: {resp.status_code} {resp.text}")
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub API error: {resp.text}",
                )
        except httpx.RequestError as e:
            logger.error(f"Gist create request failed: {e}")
            raise HTTPException(status_code=502, detail=f"Gist API error: {e}")


@router.get("/pull", response_model=SyncPullResponse)
async def sync_pull(
    gist_id: str,
    filename: str,
    authorization: str = Header(None, alias="Authorization"),
):
    """
    Pull workspace data from a GitHub Gist.
    Returns the content of the specified filename within the Gist.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/gists/{gist_id}",
                headers=headers,
            )
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Gist not found")
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub API error: {resp.text}",
                )

            data = resp.json()
            files = data.get("files", {})
            file_data = files.get(filename)

            if not file_data:
                raise HTTPException(status_code=404, detail=f"File '{filename}' not found in Gist")

            return SyncPullResponse(
                status="ok",
                content=file_data.get("content", ""),
                updated_at=file_data.get("updated_at"),
            )
        except httpx.RequestError as e:
            logger.error(f"Gist pull request failed: {e}")
            raise HTTPException(status_code=502, detail=f"Gist API error: {e}")
