from Graph.Node import Node, NodeLabels
from .DefinitionRange import DefinitionRange


class ClassNode(Node):
    def __init__(self, name: str, path: str, definition_range: DefinitionRange):
        super().__init__(NodeLabels.CLASS, path)
        self.name = name
        self.definition_range = definition_range

    def __str__(self):
        return f"{self.label}({self.path})#{self.name}"
