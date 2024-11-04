import os


class File:
    def __init__(self, name: str, root_path: str, level: int):
        self.name = name
        self.root_path = root_path
        self.level = level

    @property
    def path(self):
        return os.path.join(self.root_path, self.name)

    @property
    def uri_path(self):
        return "file://" + self.path

    def __str__(self):
        return self.get_path()
