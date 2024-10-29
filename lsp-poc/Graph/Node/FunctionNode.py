from Graph.Node import NodeLabels
from .DefinitionRange import DefinitionRange
from .DefinitionNode import DefinitionNode


class FunctionNode(DefinitionNode):
    def __init__(self, path: str, name: str, definition_range: DefinitionRange):
        super().__init__(NodeLabels.FUNCTION, path)
        self.name = name
        self.definition_range = definition_range

    def __str__(self):
        return f"{self.label}({self.path}).{self.name}"
