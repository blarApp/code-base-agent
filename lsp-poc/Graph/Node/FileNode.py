from Graph.Node import NodeLabels
from .types.DefinitionNode import DefinitionNode


class FileNode(DefinitionNode):
    def __init__(self, path: str):
        super().__init__(NodeLabels.FILE, path)
