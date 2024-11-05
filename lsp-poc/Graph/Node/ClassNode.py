from Graph.Node import NodeLabels, DefinitionNode

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .types.CodeRange import CodeRange


class ClassNode(DefinitionNode):
    name: str
    definition_range: "CodeRange"
    node_range: "CodeRange"
    code_text: str
    level: int

    def __init__(self, **kwargs):
        super().__init__(label=NodeLabels.CLASS, **kwargs)

    @property
    def node_repr_for_identifier(self) -> str:
        return "#" + self.name

    def as_object(self) -> dict:
        obj = super().as_object()
        obj["attributes"]["start_line"] = self.node_range.start_line
        obj["attributes"]["end_line"] = self.node_range.end_line
        obj["attributes"]["text"] = self.code_text
        return obj
