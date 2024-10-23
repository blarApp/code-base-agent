from typing import List

from .File import File


class Folder:
    def __init__(self, path: str, files: List[File], folders: List["Folder"]):
        self.path = path
        self.files = files
        self.folders = folders

    @property
    def uri_path(self):
        return "file://" + self.path

    def __str__(self):
        to_return = f"{self.path}\n"
        for file in self.files:
            to_return += f"\t{file}\n"
        for folder in self.folders:
            to_return += f"\t{folder}\n"

        return to_return
