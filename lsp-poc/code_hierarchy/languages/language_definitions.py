from abc import ABC, abstractmethod
from tree_sitter import Language
from typing import Set
from graph.relationship import RelationshipType
from graph.node import NodeLabels
from tree_sitter import Node


class LanguageDefinitions(ABC):
    @staticmethod
    @abstractmethod
    def get_language() -> Language:
        pass

    @staticmethod
    @abstractmethod
    def get_relationships_group_types() -> dict[str, RelationshipType]:
        pass

    @staticmethod
    @abstractmethod
    def get_function_call_query() -> str:
        pass

    @staticmethod
    @abstractmethod
    def get_language_file_extensions() -> Set[str]:
        pass

    @staticmethod
    @abstractmethod
    def get_node_label_from_type(type: str) -> NodeLabels:
        pass

    @staticmethod
    @abstractmethod
    def should_create_node(node: Node) -> bool:
        pass

    @staticmethod
    @abstractmethod
    def get_identifier_node(node: Node):
        pass

    @staticmethod
    @abstractmethod
    def get_body_node(node: Node):
        pass
