from typing import Set, Optional
from graph.relationship import RelationshipType
from graph.node import NodeLabels

from tree_sitter import Node, Language, Parser
from graph.node import Node as GraphNode

from .language_definitions import LanguageDefinitions
import tree_sitter_javascript as tsjavascript
from typing import Dict


class JavascripLanguageDefinitions(LanguageDefinitions):
    def get_parsers_for_extensions() -> Dict[str, Parser]:
        return {
            ".js": Parser(Language(tsjavascript.language())),
            ".jsx": Parser(Language(tsjavascript.language())),
        }

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
        return JavascripLanguageDefinitions._find_relationship_type(
            node_label=node.label,
            node_in_point_reference=node_in_point_reference,
        )

    def _find_relationship_type(node_label: str, node_in_point_reference: Node) -> Optional[RelationshipType]:
        # Traverse up to find the named parent
        named_parent = node_in_point_reference
        rel_types = JavascripLanguageDefinitions._get_relationships_group_types()
        type_found = None

        while named_parent is not None and type_found is None:
            type_found = JavascripLanguageDefinitions._get_tree_sitter_node_relationship_type(
                tree_sitter_node=named_parent, relationships_types=rel_types[node_label]
            )
            named_parent = named_parent.parent
        return type_found

    def _get_tree_sitter_node_relationship_type(
        tree_sitter_node: Node, relationships_types: dict
    ) -> Optional[RelationshipType]:
        if tree_sitter_node is None:
            return None

        return relationships_types.get(tree_sitter_node.type, None)

    def get_body_node(node: Node) -> Node:
        if JavascripLanguageDefinitions._is_variable_declaration_arrow_function(node):
            return node.child_by_field_name("value").child_by_field_name("body")

        return LanguageDefinitions.get_body_node(node)

    def get_language_file_extensions() -> Set[str]:
        return {".js", ".jsx"}

    def get_node_label_from_type(type: str) -> NodeLabels:
        # This method may need to be refactored to take the node instead in order to verify more complex node types
        if type == "variable_declarator":
            return NodeLabels.FUNCTION

        return {
            "class_declaration": NodeLabels.CLASS,
            "function_declaration": NodeLabels.FUNCTION,
            "method_definition": NodeLabels.FUNCTION,
        }[type]

    def _get_relationships_group_types() -> dict:
        return {
            NodeLabels.CLASS: {
                "import_specifier": RelationshipType.IMPORTS,
                "import_clause": RelationshipType.IMPORTS,
                "new_expression": RelationshipType.INSTANTIATES,
                "class_heritage": RelationshipType.INHERITS,
            },
            NodeLabels.FUNCTION: {
                "import_specifier": RelationshipType.IMPORTS,
                "import_clause": RelationshipType.IMPORTS,
                "call_expression": RelationshipType.CALLS,
            },
        }
