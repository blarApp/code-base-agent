from abc import ABC, abstractmethod
from tree_sitter import Language, Parser
from typing import Set
from graph.relationship import RelationshipType
from graph.node import NodeLabels
from tree_sitter import Node
from typing import Optional, Dict


class LanguageDefinitions(ABC):
    @staticmethod
    @abstractmethod
    def should_create_node(node: Node) -> bool:
        """This method should return a boolean indicating if a node should be created"""
        pass

    @staticmethod
    @abstractmethod
    def get_identifier_node(node: Node) -> Node:
        """This method should return the identifier node for a given node,
        this name will be used as the node name in the graph.

        This node should match the LSP document symbol range.
        """
        if identifier := node.child_by_field_name("name"):
            return identifier

        raise Exception("No identifier node found")

    @staticmethod
    @abstractmethod
    def get_body_node(node: Node) -> Node:
        """This method should return the body node for a given node,
        this node should contain the code block for the node without any signatures.
        """
        if body := node.child_by_field_name("body"):
            return body
        raise Exception("No body node found")

    @staticmethod
    @abstractmethod
    def get_relationship_type(node: Node, node_in_point_reference: Node) -> Optional[RelationshipType]:
        """This method should tell you how the node is being used in the node_in_point_reference"""
        pass

    @staticmethod
    @abstractmethod
    def get_node_label_from_type(type: str) -> NodeLabels:
        """This method should return the node label for a given node type"""
        pass

    @staticmethod
    @abstractmethod
    def get_language_file_extensions() -> Set[str]:
        """This method should return the file extensions for the language"""
        pass

    @staticmethod
    @abstractmethod
    def get_parsers_for_extensions() -> Dict[str, Parser]:
        """This method should return the parsers for the language"""
        pass
