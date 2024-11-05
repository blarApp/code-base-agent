from Graph.Node import NodeLabels
from .types.DefinitionNode import DefinitionNode


class FileNode(DefinitionNode):
    def __init__(self, **kwargs):
        super().__init__(label=NodeLabels.FILE, **kwargs)
