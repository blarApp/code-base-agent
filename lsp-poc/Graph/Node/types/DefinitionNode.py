from typing import List, Union, TYPE_CHECKING
from Graph.Relationship import RelationshipCreator
from .Node import Node

if TYPE_CHECKING:
    from ..ClassNode import ClassNode
    from ..FunctionNode import FunctionNode
    from Graph.Relationship import Relationship
    from .CodeRange import CodeRange


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

    def relate_node_as_define_relationship(self, node: Union["ClassNode", "FunctionNode"]) -> None:
        self._defines.append(node)

    def relate_nodes_as_define_relationship(self, nodes: List[Union["ClassNode", "FunctionNode"]]) -> None:
        self._defines.extend(nodes)

    def get_relationships(self) -> List["Relationship"]:
        relationships = []
        for node in self._defines:
            relationships.append(RelationshipCreator.create_defines_relationship(self, node))

        return relationships

    def reference_search(self, reference: dict) -> "DefinitionNode":
        reference_range = reference["range"]
        reference_start = reference_range["start"]["line"]
        reference_end = reference_range["end"]["line"]

        for node in self._defines:
            range = node.node_range
            scope_start = range.start_line
            scope_end = range.end_line

            if self.is_reference_within_scope(reference_start, reference_end, scope_start, scope_end):
                return node.reference_search(reference=reference)

            if self.is_reference_end_before_scope_start(reference_end, scope_start):
                break

        return self

    def is_reference_within_scope(
        self, reference_start: int, reference_end: int, scope_start: int, scope_end: int
    ) -> bool:
        return scope_start <= reference_start and scope_end >= reference_end

    def is_reference_end_before_scope_start(self, reference_end: int, scope_start: int) -> bool:
        return reference_end < scope_start

    def skeletonize(self):
        self._replace_code_of_children_for_id()

    def _replace_code_of_children_for_id(self):
        for node in self._defines:
            self.code_text = self.code_text.replace(node.code_text, node._get_text_for_skeleton())
            node.skeletonize()

    def _get_text_for_skeleton(self):
        return f""" 
        # Definition: {self.name}
        # Code replaced, see node: {self.hashed_id} 

        """
