from typing import Set, Optional
from graph.relationship import RelationshipType
from graph.node import NodeLabels

from tree_sitter import Node, Language

from .language_definitions import LanguageDefinitions
import tree_sitter_javascript as tsjavascript


class JavascripLanguageDefinitions(LanguageDefinitions):
    def get_language() -> Language:
        return Language(tsjavascript.language())

    def should_create_node(node: Node) -> bool:
        if node.type == "class_declaration":
            return True
        if node.type == "function_declaration":
            return True
        if node.type == "method_definition":
            return True
        return False

    def get_identifier_node(node: Node) -> Node:
        return LanguageDefinitions.get_identifier_node(node)

    def get_relationship_type(node: Node, node_in_point_reference: Node) -> Optional[RelationshipType]:
        return RelationshipType.USES

    def get_body_node(node: Node) -> Node:
        return LanguageDefinitions.get_body_node(node)

    def get_language_file_extensions() -> Set[str]:
        return {".js"}

    def get_node_label_from_type(type: str) -> NodeLabels:
        return {
            "class_declaration": NodeLabels.CLASS,
            "function_declaration": NodeLabels.FUNCTION,
            "method_definition": NodeLabels.FUNCTION,
        }[type]
