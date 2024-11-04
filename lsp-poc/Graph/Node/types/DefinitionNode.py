from typing import List, Union, TYPE_CHECKING
from Graph.Relationship import RelationshipCreator
from .Node import Node
from .CodeRange import CodeRange

if TYPE_CHECKING:
    from ..ClassNode import ClassNode
    from ..FunctionNode import FunctionNode
    from Graph.Relationship import Relationship


class DefinitionNode(Node):
    _defines: List[Union["ClassNode", "FunctionNode"]]
    definition_range: "CodeRange"
    node_range: "CodeRange"
    code_text: str

    def __init__(self, definition_range, node_range, code_text, *args, **kwargs):
        self._defines: List[Union["ClassNode", "FunctionNode"]] = []
        self.definition_range = definition_range
        self.node_range = node_range
        self.code_text = code_text
        super().__init__(*args, **kwargs)

    def relate_node_as_define_relationship(self, node: Union["ClassNode", "FunctionNode"]):
        self._defines.append(node)

    def relate_nodes_as_define_relationship(self, nodes: List[Union["ClassNode", "FunctionNode"]]):
        self._defines.extend(nodes)

    def get_relationships(self) -> List["Relationship"]:
        relationships = []
        for node in self._defines:
            relationships.append(RelationshipCreator.create_defines_relationship(self, node))

        return relationships

    def reference_search(self, reference: dict):
        reference_range = reference["range"]
        reference_start = reference_range["start"]["line"]
        reference_end = reference_range["end"]["line"]

        for scope in self._defines:
            range = scope.node_range
            scope_start = range.start_line
            scope_end = range.end_line
            if scope_start <= reference_start and scope_end >= reference_end:
                return scope.reference_search(reference=reference)

        return self
