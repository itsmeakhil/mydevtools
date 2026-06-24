
from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.notes import services as note_svc
from app.api.routes.notes.schema import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut], summary="List notes for current user")
async def list_notes(
    uid: str = Depends(get_current_uid),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[NoteOut]:
    return await note_svc.list_notes_paginated(uid=uid, skip=skip, limit=limit)


@router.get("/{note_id}", response_model=NoteOut, summary="Get a single note with full content")
async def get_note(note_id: str, uid: str = Depends(get_current_uid)) -> NoteOut:
    return await note_svc.get_note(uid=uid, note_id=note_id)


@router.post("", response_model=NoteOut, summary="Create a note")
async def create_note(body: NoteCreate, uid: str = Depends(get_current_uid)) -> NoteOut:
    return await note_svc.create_note(uid, body)


@router.patch("/{note_id}", response_model=NoteOut, summary="Update a note (partial)")
async def patch_note(note_id: str, body: NoteUpdate, uid: str = Depends(get_current_uid)) -> NoteOut:
    return await note_svc.update_note(uid, note_id, body)


@router.delete("/{note_id}", status_code=204, summary="Delete a note")
async def delete_note(
    note_id: str,
    recursive: bool = Query(default=True, description="Delete descendants as well"),
    uid: str = Depends(get_current_uid),
) -> None:
    await note_svc.delete_note(uid, note_id, recursive=recursive)
