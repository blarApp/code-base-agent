from collections import defaultdict
from .node import Node, NodeLabels
from .node import FileNode

from typing import List, TYPE_CHECKING, Dict, Set, DefaultDict

if TYPE_CHECKING:
    from .relationship import Relationship


class Graph:
    nodes_by_path: DefaultDict[str, Set[Node]]
    file_nodes_by_path: Dict[str, FileNode]
    folder_nodes_by_path: Dict[str, Node]
    nodes_by_label: DefaultDict[str, Set[Node]]
    nodes: Dict[str, Node]
    references_relationships: List["relationship"]

    def __init__(self):
        self.nodes = {}
        self.nodes_by_path = defaultdict(set)
        self.file_nodes_by_path = {}
        self.folder_nodes_by_path = {}
        self.nodes_by_label = defaultdict(set)
        self.references_relationships = []

    def has_folder_node_with_path(self, path: str) -> bool:
        return path in self.folder_nodes_by_path

    def add_nodes(self, nodes: List[Node]) -> None:
        for node in nodes:
            self.add_node(node)

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node
        self.nodes_by_path[node.path].add(node)
        self.nodes_by_label[node.label].add(node)

        if node.label == NodeLabels.FILE:
            self.file_nodes_by_path[node.path] = node

        if node.label == NodeLabels.FOLDER:
            self.folder_nodes_by_path[node.path] = node

    def get_nodes_by_path(self, path: str) -> set:
        return self.nodes_by_path[path]

    def get_file_node_by_path(self, path: str) -> FileNode:
        return self.file_nodes_by_path[path]

    def get_folder_node_by_path(self, path: str) -> Node:
        return self.folder_nodes_by_path[path]

    def get_nodes_by_label(self, label: str) -> set:
        return self.nodes_by_label[label]

    def get_node_by_id(self, id: str) -> Node:
        return self.nodes[id]

    def get_relationships_as_objects(self) -> List[dict]:
        internal_relationships = [relationship.as_object() for relationship in self.get_relationships()]
        reference_relationships = [relationship.as_object() for relationship in self.references_relationships]

        return internal_relationships + reference_relationships

    def get_relationships(self) -> List["relationship"]:
        relationships = []
        for node in self.nodes.values():
            relationships.extend(node.get_relationships())

        return relationships

    def add_references_relationships(self, references_relationships: List["relationship"]) -> None:
        self.references_relationships.extend(references_relationships)

    def get_nodes_as_objects(self) -> List[dict]:
        return [node.as_object() for node in self.nodes.values()]

    def __str__(self) -> str:
        to_return = ""

        for node in self.nodes.values():
            to_return += f"{node}\n"

        for relationship in self.relationships.values():
            to_return += f"{relationship}\n"

        return to_return
