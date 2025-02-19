import os


class File:
    name: str
    root_path: str
    level: int

    def __init__(self, name: str, root_path: str, level: int):
        self.name = name
        self.root_path = root_path
        self.level = level

    @property
    def path(self) -> str:
        return os.path.join(self.root_path, self.name)

    @property
    def extension(self) -> str:
        return os.path.splitext(self.name)[1]

    @property
    def uri_path(self) -> str:
        return "file://" + self.path

    def __str__(self) -> str:
        return self.get_path()
