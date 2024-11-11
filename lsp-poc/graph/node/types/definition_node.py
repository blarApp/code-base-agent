from typing import List, Union, TYPE_CHECKING
from graph.relationship import RelationshipCreator
from .node import Node

if TYPE_CHECKING:
    from ..class_node import ClassNode
    from ..function_node import FunctionNode
    from graph.relationship import Relationship
    from code_references.types import Reference
    from tree_sitter import Node as TreeSitterNode
    from code_hierarchy import Reference


class DefinitionNode(Node):
    _defines: List[Union["ClassNode", "FunctionNode"]]
    definition_range: "Reference"
    node_range: "Reference"
    code_text: str
    body_text: str
    _tree_sitter_node: "TreeSitterNode"

    def __init__(
        self, definition_range, node_range, code_text, body_text, tree_sitter_node: "TreeSitterNode", *args, **kwargs
    ):
        self._defines: List[Union["ClassNode", "FunctionNode"]] = []
        self.definition_range = definition_range
        self.node_range = node_range
        self.code_text = code_text
        self.body_text = body_text
        self._tree_sitter_node = tree_sitter_node
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

    def get_start_and_end_line(self):
        return self.node_range.range.start.line, self.node_range.range.end.line

    def reference_search(self, reference: "Reference") -> "DefinitionNode":
        reference_start = reference.range.start.line
        reference_end = reference.range.end.line

        for node in self._defines:
            start_line, end_line = node.get_start_and_end_line()

            if self.is_reference_within_scope(
                reference_start=reference_start,
                reference_end=reference_end,
                scope_start=start_line,
                scope_end=end_line,
            ):
                return node.reference_search(reference=reference)

            if self.is_reference_end_before_scope_start(reference_end, start_line):
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
            self.code_text = self.code_text.replace(node.body_text, node._get_text_for_skeleton())
            node.skeletonize()

    def _get_text_for_skeleton(self):
        return f""" # Code replaced for brevity, see node: {self.hashed_id} """
