from .types.CodeRange import CodeRange
from .types.DefinitionNode import DefinitionNode
from Graph.Node import NodeLabels


class ClassNode(DefinitionNode):
    def __init__(self, name: str, path: str, definition_range: CodeRange, node_range: CodeRange):
        super().__init__(
            label=NodeLabels.CLASS, path=path, name=name, definition_range=definition_range, node_range=node_range
        )

    def __str__(self):
        return f"{self.label}({self.path})#{self.name}"
