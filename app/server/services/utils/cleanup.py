# server/utils/cleanup.py
from __future__ import annotations
from pathlib import Path
import os
import shutil
import stat
import time
from typing import Iterable, Optional

def _force_writable(path: Path) -> None:
    """Make a file/dir writable so it can be deleted on Windows."""
    try:
        mode = os.stat(path, follow_symlinks=False).st_mode
        os.chmod(path, mode | stat.S_IWRITE)
    except Exception:
        pass

def _on_rm_error(func, path, exc_info):
    """shutil.rmtree error callback: try to make writable then retry."""
    try:
        _force_writable(Path(path))
        func(path)
    except Exception:
        # give it one tiny retry after a short sleep
        time.sleep(0.05)
        try:
            func(path)
        except Exception:
            pass

def purge_all_children(dirpath: Path, keep: Optional[Iterable[str]] = None) -> int:
    """
    Delete ALL immediate children (files & subdirs) of `dirpath`.
    - Subdirectories are removed recursively (rmtree).
    - 'keep' is a set of names to skip (top-level only). Use keep=None to keep nothing.
    Returns the number of top-level entries removed.
    """
    removed = 0
    keep_set = set(keep or [])
    dirpath.mkdir(parents=True, exist_ok=True)

    # Safety: never allow walking outside of dirpath
    root = dirpath.resolve()

    for entry in root.iterdir():
        if entry.name in keep_set:
            continue

        # Never follow symlinks into unexpected places
        try:
            # If it's a symlink, just unlink the link itself
            if entry.is_symlink():
                entry.unlink(missing_ok=True)
                removed += 1
                continue
        except Exception:
            # If we can't stat, attempt to unlink directly
            try:
                entry.unlink(missing_ok=True)
                removed += 1
                continue
            except Exception:
                continue

        try:
            if entry.is_dir():
                # Make sure read-only bits don't block deletion
                _force_writable(entry)
                shutil.rmtree(entry, onerror=_on_rm_error)
                removed += 1
            else:
                _force_writable(entry)
                entry.unlink(missing_ok=True)
                removed += 1
        except Exception:
            # last resort: try again after a blink (in case another proc just released the handle)
            time.sleep(0.05)
            try:
                if entry.is_dir():
                    shutil.rmtree(entry, onerror=_on_rm_error)
                    removed += 1
                else:
                    entry.unlink(missing_ok=True)
                    removed += 1
            except Exception:
                # Give up on this entry; continue with others
                pass

    return removed

def purge_dirs(dirs: Iterable[Path], keep: Optional[Iterable[str]] = None) -> int:
    total = 0
    for d in dirs:
        total += purge_all_children(Path(d), keep)
    return total
