from Graph.Node import NodeLabels
from .DefinitionRange import DefinitionRange
from .DefinitionNode import DefinitionNode


class ClassNode(DefinitionNode):
    def __init__(
        self,
        name: str,
        path: str,
        definition_range: DefinitionRange,
        node_range: DefinitionRange,
        code_text: str,
        level: int,
    ):
        super().__init__(NodeLabels.CLASS, path, name, level)
        self.definition_range = definition_range
        self.code_text = code_text
        self.node_range = node_range

    def __str__(self):
        return f"{self.label}({self.path})#{self.name}"

    def as_object(self):
        obj = super().as_object()
        obj["attributes"]["start_line"] = self.node_range.start_line
        obj["attributes"]["end_line"] = self.node_range.end_line
        obj["attributes"]["text"] = self.code_text
        return obj
