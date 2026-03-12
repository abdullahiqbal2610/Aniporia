import uuid
from services.supabase_client import get_supabase

BUCKET_NAME = "notes"


def upload_note_image(file_bytes: bytes, original_filename: str, user_id: str) -> str:
    """
    Uploads a note image to Supabase Storage.
    Returns the public URL of the uploaded file.

    Storage path: notes/{user_id}/{uuid}.{ext}
    """
    supabase = get_supabase()

    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "png"
    unique_name = f"{user_id}/{uuid.uuid4()}.{ext}"

    supabase.storage.from_(BUCKET_NAME).upload(
        path=unique_name,
        file=file_bytes,
        file_options={"content-type": f"image/{ext}"},
    )

    # Build the public URL
    public_url = (
        supabase.storage.from_(BUCKET_NAME).get_public_url(unique_name)
    )

    return public_url, unique_name


def delete_note_image(storage_path: str) -> None:
    """Deletes a file from Supabase Storage by its storage path."""
    supabase = get_supabase()
    supabase.storage.from_(BUCKET_NAME).remove([storage_path])
