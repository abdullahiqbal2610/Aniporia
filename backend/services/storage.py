import uuid
from services.supabase_client import get_supabase

BUCKET_NAME = "uploads"

CONTENT_TYPE_MAP = {
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
    "png":  "image/png",
    "webp": "image/webp",
}


def upload_note_image(file_bytes: bytes, original_filename: str, user_id: str) -> tuple[str, str]:
    """
    Uploads an image to Supabase Storage.
    Returns (public_url, storage_path).
    """
    supabase = get_supabase()

    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "png"
    content_type = CONTENT_TYPE_MAP.get(ext, "image/png")
    unique_name = f"{user_id}/{uuid.uuid4()}.{ext}"

    supabase.storage.from_(BUCKET_NAME).upload(
        path=unique_name,
        file=file_bytes,
        file_options={"content-type": content_type},
    )

    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(unique_name)

    return public_url, unique_name


def delete_note_image(storage_path: str) -> None:
    supabase = get_supabase()
    supabase.storage.from_(BUCKET_NAME).remove([storage_path])