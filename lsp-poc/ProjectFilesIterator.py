import os
from typing import List
from Folder import Folder
from File import File


class ProjectFilesIterator:
    def __init__(self, root_path: str, paths_to_skip: List[str] = None):
        self.paths_to_skip = paths_to_skip or []
        self.root_path = root_path

    def __iter__(self):
        for root, dirs, files in os.walk(self.root_path):
            if not self._should_skip(root):
                yield Folder(
                    root,
                    self._get_filtered_files(root, files),
                    self._get_filtered_folders(root, dirs),
                )

    def _get_filtered_files(self, root: str, files: List[str]) -> List[File]:
        files = [
            file for file in files if not self._should_skip(os.path.join(root, file))
        ]

        return [File(name=file, root_path=root) for file in files]

    def _get_filtered_folders(self, root: str, folders: List[str]) -> List[Folder]:
        folders = [
            folder
            for folder in folders
            if not self._should_skip(os.path.join(root, folder))
        ]

        return [Folder(os.path.join(root, dir), [], []) for dir in folders]

    def _should_skip(self, path: str) -> bool:
        return any(
            [path.startswith(path_to_skip) for path_to_skip in self.paths_to_skip]
        )


if __name__ == "__main__":
    for folder in ProjectFilesIterator(
        "/home/juan/devel/blar/lsp-poc/",
        paths_to_skip=[
            "/home/juan/devel/blar/lsp-poc/__pycache__",
            "/home/juan/devel/blar/lsp-poc/.git",
            "/home/juan/devel/blar/lsp-poc/.venv",
            "/home/juan/devel/blar/lsp-poc/Graph/__pycache__",
            "/home/juan/devel/blar/lsp-poc/Graph/Node/__pycache__",
            "/home/juan/devel/blar/lsp-poc/Graph/Relationship/__pycache__",
            "/home/juan/devel/blar/lsp-poc/LSP/__pycache__",
        ],
    ):
        print(folder)
