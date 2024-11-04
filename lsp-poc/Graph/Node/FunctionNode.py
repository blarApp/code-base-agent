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

    def as_object(self):
        obj = super().as_object()
        obj["attributes"]["start_line"] = self.node_range.start_line
        obj["attributes"]["end_line"] = self.node_range.end_line
        obj["attributes"]["text"] = self.code_text
        return obj
