from typing import Set, Optional
from graph.relationship import RelationshipType
from graph.node import NodeLabels

from tree_sitter import Node, Language
from graph.node import Node as GraphNode

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
        if node.type == "variable_declarator":
            return JavascripLanguageDefinitions._is_variable_declaration_arrow_function(node)
        return False

    def _is_variable_declaration_arrow_function(node: Node) -> bool:
        if node.type == "variable_declarator" and (children := node.child_by_field_name("value")):
            return children.type == "arrow_function"

    def get_identifier_node(node: Node) -> Node:
        return LanguageDefinitions.get_identifier_node(node)

    def get_relationship_type(node: GraphNode, node_in_point_reference: Node) -> Optional[RelationshipType]:
        print("get_relationship_type")
        print(node.label)
        print(node_in_point_reference.type)

        return RelationshipType.USES

    def get_body_node(node: Node) -> Node:
        if JavascripLanguageDefinitions._is_variable_declaration_arrow_function(node):
            return node.child_by_field_name("value").child_by_field_name("body")

        return LanguageDefinitions.get_body_node(node)

    def get_language_file_extensions() -> Set[str]:
        return {".js"}

    def get_node_label_from_type(type: str) -> NodeLabels:
        # This method may need to be refactored to take the node instead in order to verify more complex node types
        if type == "variable_declarator":
            return NodeLabels.FUNCTION

        return {
            "class_declaration": NodeLabels.CLASS,
            "function_declaration": NodeLabels.FUNCTION,
            "method_definition": NodeLabels.FUNCTION,
        }[type]
