"""Create a ready-to-upload site archive and a complete editable project archive."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports"
DIST = ROOT / "dist"
EXCLUDED_DIRS = {".git", "node_modules", "dist", "exports", "__pycache__", ".vite"}
EXCLUDED_FILES = {".DS_Store"}
ALREADY_COMPRESSED = {".png", ".jpg", ".jpeg", ".webp", ".mp4", ".glb", ".blend", ".blend1", ".psd", ".docx", ".zip"}


def add_tree(archive: ZipFile, base: Path, prefix: str = "") -> int:
    count = 0
    for path in sorted(base.rglob("*")):
        if not path.is_file() or path.is_symlink() or path.name in EXCLUDED_FILES:
            continue
        rel = path.relative_to(base)
        if any(part in EXCLUDED_DIRS for part in rel.parts[:-1]):
            continue
        name = f"{prefix}{rel.as_posix()}"
        compression = ZIP_STORED if path.suffix.lower() in ALREADY_COMPRESSED else ZIP_DEFLATED
        archive.write(path, name, compress_type=compression, compresslevel=6)
        count += 1
    return count


def create(path: Path, base: Path, prefix: str = "") -> None:
    with ZipFile(path, "w", allowZip64=True) as archive:
        count = add_tree(archive, base, prefix)
    with ZipFile(path) as archive:
        damaged = archive.testzip()
        assert damaged is None, f"Damaged file in archive: {damaged}"
        assert len(archive.namelist()) == count
        print(f"{path.name}: {count} files, {path.stat().st_size / 1024 / 1024:.1f} MiB")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    assert (DIST / "index.html").is_file(), "Run npm run build first"
    create(OUT / "拾频-网站上传包.zip", DIST)
    create(OUT / "拾频-完整源码备份.zip", ROOT, "拾频-完整源码/")
