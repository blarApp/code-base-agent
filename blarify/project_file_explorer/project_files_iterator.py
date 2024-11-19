import os
from typing import List, Iterator
from .folder import Folder
from .file import File


class ProjectFilesIterator:
    root_path: str
    paths_to_skip: List[str]
    names_to_skip: List[str]

    def __init__(
        self,
        root_path: str,
        paths_to_skip: List[str] = None,
        names_to_skip: List[str] = None,
        blarignore_path: str = None,
    ):
        self.paths_to_skip = paths_to_skip or []
        self.root_path = root_path
        self.names_to_skip = names_to_skip or []

        if blarignore_path:
            self.names_to_skip.extend(self.get_ignore_files(blarignore_path))

    def get_ignore_files(self, gitignore_path: str) -> List[str]:
        with open(gitignore_path, "r") as f:
            return [line.strip() for line in f.readlines()]

    def __iter__(self) -> Iterator[Folder]:
        for current_path, dirs, files in os.walk(self.root_path, topdown=True):
            dirs[:] = self._get_filtered_dirs(current_path, dirs)
            level = self.get_path_level_relative_to_root(current_path)
            files = self._get_filtered_files(current_path, files, level + 1)
            folders = self.empty_folders_from_dirs(current_path, dirs, level + 1)
            name = self.get_base_name(current_path) if current_path == "/" else self.get_base_name(self.root_path)

            if not self._should_skip(current_path):
                yield Folder(
                    name=name,
                    path=current_path,
                    files=files,
                    folders=folders,
                    level=level,
                )

    def _get_filtered_dirs(self, root: str, dirs: List[str]) -> List[Folder]:
        dirs = [dir for dir in dirs if not self._should_skip(os.path.join(root, dir))]
        return dirs

    def get_path_level_relative_to_root(self, path) -> int:
        level = path.count(os.sep) - self.root_path.count(os.sep)
        return level

    def _get_filtered_files(self, root: str, files: List[str], level: int) -> List[File]:
        files = [file for file in files if not self._should_skip(os.path.join(root, file))]

        return [File(name=file, root_path=root, level=level) for file in files]

    def empty_folders_from_dirs(self, root: str, dirs: List[str], level) -> List[Folder]:
        return [
            Folder(
                name=dir,
                path=os.path.join(root, dir),
                files=[],
                folders=[],
                level=level,
            )
            for dir in dirs
        ]

    def _should_skip(self, path: str) -> bool:
        if path.find("Chat menu") != -1:
            pass
        is_basename_in_names_to_skip = os.path.basename(path) in self.names_to_skip

        is_path_in_paths_to_skip = any(path.startswith(path_to_skip) for path_to_skip in self.paths_to_skip)

        return is_basename_in_names_to_skip or is_path_in_paths_to_skip

    def get_base_name(self, current_path: str) -> str:
        return os.path.basename(current_path)
