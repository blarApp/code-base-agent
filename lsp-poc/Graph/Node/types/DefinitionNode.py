from typing import List, Union, TYPE_CHECKING
from Graph.Relationship import RelationshipCreator
from .Node import Node
from .CodeRange import CodeRange

if TYPE_CHECKING:
    from ..ClassNode import ClassNode
    from ..FunctionNode import FunctionNode
    from Graph.Relationship import Relationship


class DefinitionNode(Node):
    name: str
    definition_range: "CodeRange"
    node_range: "CodeRange"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._defines: List[Union["ClassNode", "FunctionNode"]] = []
        self.definition_range = kwargs.get("definition_range")
        self.node_range = kwargs.get("node_range")
        self.name = kwargs.get("name")

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
        if len(self._defines) == 0:
            return self

        reference_range = reference["range"]
        reference_start = reference_range["start"]["line"]
        reference_end = reference_range["end"]["line"]

        for scope in self._defines:
            range = scope.definition_range
            scope_start = range.start_line
            scope_end = range.end_line
            if scope_start <= reference_start and scope_end >= reference_end:
                return scope.reference_search(reference=reference)
