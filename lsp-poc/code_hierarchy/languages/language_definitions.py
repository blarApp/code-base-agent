from abc import ABC, abstractmethod
from tree_sitter import Language
from typing import Set
from graph.relationship import RelationshipType
from graph.node import NodeLabels
from tree_sitter import Node
from typing import Optional


class LanguageDefinitions(ABC):
    @abstractmethod
    @staticmethod
    def get_language() -> Language:
        """This method should return the tree-sitter language for the language definition"""
        pass

    @abstractmethod
    @staticmethod
    def should_create_node(node: Node) -> bool:
        """This method should return a boolean indicating if a node should be created"""
        pass

    @abstractmethod
    @staticmethod
    def get_identifier_node(node: Node) -> Node:
        """This method should return the identifier node for a given node,
        this name will be used as the node name in the graph.

        This node should match the LSP document symbol range.
        """
        pass

    @abstractmethod
    @staticmethod
    def get_body_node(node: Node) -> Node:
        """This method should return the body node for a given node,
        this node should contain the code block for the node without any signatures.
        """
        pass

    @abstractmethod
    @staticmethod
    def get_relationship_type(node: Node, node_in_point_reference: Node) -> Optional[RelationshipType]:
        """This method should tell you how the node is being used in the node_in_point_reference"""
        pass

    @abstractmethod
    @staticmethod
    def get_node_label_from_type(type: str) -> NodeLabels:
        """This method should return the node label for a given node type"""
        pass

    @abstractmethod
    @staticmethod
    def get_language_file_extensions() -> Set[str]:
        """This method should return the file extensions for the language"""
        pass
