from typing import List

from .file import File


class Folder:
    name: str
    path: str

    def __init__(self, name: str, path: str, files: List[File], folders: List["Folder"], level: int):
        self.name = name
        self.path = path
        self.files = files
        self.folders = folders
        self.level = level

    @property
    def uri_path(self) -> str:
        return "file://" + self.path

    def __str__(self) -> str:
        to_return = f"{self.path}\n"
        for file in self.files:
            to_return += f"\t{file}\n"
        for folder in self.folders:
            to_return += f"\t{folder}\n"

        return to_return
