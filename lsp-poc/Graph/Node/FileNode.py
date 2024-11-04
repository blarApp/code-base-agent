from Graph.Node import NodeLabels
from .types.DefinitionNode import DefinitionNode


class FileNode(DefinitionNode):
    path: str
    name: str
    level: int

    def __init__(self, path: str, name: str, level: int, *args, **kwargs):
        super().__init__(label=NodeLabels.FILE, path=path, name=name, level=level, *args, **kwargs)
