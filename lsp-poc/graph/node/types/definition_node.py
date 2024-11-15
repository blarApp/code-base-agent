from typing import List, Optional, Tuple, Union, TYPE_CHECKING
from graph.relationship import RelationshipCreator
from .node import Node

if TYPE_CHECKING:
    from ..class_node import ClassNode
    from ..function_node import FunctionNode
    from graph.relationship import Relationship
    from code_references.types import Reference
    from tree_sitter import Node as TreeSitterNode


class DefinitionNode(Node):
    _defines: List[Union["ClassNode", "FunctionNode"]]
    definition_range: "Reference"
    node_range: "Reference"
    code_text: str
    body_node: Optional["TreeSitterNode"]
    _tree_sitter_node: "TreeSitterNode"

    def __init__(
        self, definition_range, node_range, code_text, body_node, tree_sitter_node: "TreeSitterNode", *args, **kwargs
    ):
        self._defines: List[Union["ClassNode", "FunctionNode"]] = []
        self.definition_range = definition_range
        self.node_range = node_range
        self.code_text = code_text
        self.body_node = body_node
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

    def skeletonize(self) -> None:
        if self._tree_sitter_node is None:
            return

        parent_node = self._tree_sitter_node
        text_bytes = parent_node.text
        bytes_offset = 0
        for node in self._defines:
            if node.body_node is None:
                continue

            start_text, start_byte = node.get_start_text_bytes(parent_text_bytes=text_bytes, bytes_offset=bytes_offset)
            end_text, end_byte = node.get_end_text_bytes(parent_text_bytes=text_bytes, bytes_offset=bytes_offset)
            text_bytes = start_text + node._get_text_for_skeleton() + end_text

            bytes_offset += len(node._get_text_for_skeleton()) - (end_byte - start_byte)

            self.code_text = text_bytes.decode("utf-8")

            node.skeletonize()

    def remove_line_break_if_present(self, text: bytes, end_byte: int) -> Tuple[bytes, int]:
        if text[0:1] == b"\n":
            return text[1:], end_byte - 1

        return text, end_byte

    def get_start_text_bytes(self, parent_text_bytes: bytes, bytes_offset: int) -> Tuple[bytes, int]:
        start_byte = self.body_node.start_byte - 1 + bytes_offset
        return parent_text_bytes[:start_byte], start_byte

    def get_end_text_bytes(self, parent_text_bytes: bytes, bytes_offset: int) -> Tuple[bytes, int]:
        end_byte = self.body_node.end_byte + bytes_offset
        return self.remove_line_break_if_present(text=parent_text_bytes[end_byte:], end_byte=end_byte)

    def _get_text_for_skeleton(self) -> bytes:
        return f"# Code replaced for brevity, see node: {self.hashed_id}\n".encode("utf-8")
