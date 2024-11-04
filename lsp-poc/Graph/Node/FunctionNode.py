from Graph.Node import NodeLabels
from .types.CodeRange import CodeRange
from .types.DefinitionNode import DefinitionNode


class FunctionNode(DefinitionNode):
    def __init__(self, path: str, name: str, definition_range: CodeRange, node_range: CodeRange):
        super().__init__(
            label=NodeLabels.FUNCTION, path=path, name=name, definition_range=definition_range, node_range=node_range
        )

    def __str__(self):
        return f"{self.label}({self.path}).{self.name}"
