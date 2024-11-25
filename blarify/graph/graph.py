from collections import defaultdict
from blarify.graph.node import Node, NodeLabels
from blarify.graph.node import FileNode
from blarify.graph.relationship import Relationship

from typing import List, TYPE_CHECKING, Dict, Set, DefaultDict, Optional

if TYPE_CHECKING:
    from .relationship import RelationshipType


class Graph:
    nodes_by_path: DefaultDict[str, Set[Node]]
    file_nodes_by_path: Dict[str, FileNode]
    folder_nodes_by_path: Dict[str, Node]
    nodes_by_label: DefaultDict[str, Set[Node]]
    __nodes: Dict[str, Node]
    __references_relationships: List["Relationship"]
    __custom_relationships: List["Relationship"]

    def __init__(self):
        self.__nodes = {}
        self.__references_relationships = []
        self.__custom_relationships = []
        self.nodes_by_path = defaultdict(set)
        self.file_nodes_by_path = {}
        self.folder_nodes_by_path = {}
        self.nodes_by_label = defaultdict(set)

    def has_folder_node_with_path(self, path: str) -> bool:
        return path in self.folder_nodes_by_path

    def add_nodes(self, nodes: List[Node]) -> None:
        for node in nodes:
            self.add_node(node)

    def add_node(self, node: Node) -> None:
        self.__nodes[node.id] = node
        self.nodes_by_path[node.path].add(node)
        self.nodes_by_label[node.label].add(node)

        if node.label == NodeLabels.FILE:
            self.file_nodes_by_path[node.path] = node

        if node.label == NodeLabels.FOLDER:
            self.folder_nodes_by_path[node.path] = node

    def get_nodes_by_path(self, path: str) -> set:
        return self.nodes_by_path[path]

    def get_file_node_by_path(self, path: str) -> Optional[FileNode]:
        return self.file_nodes_by_path.get(path)

    def get_folder_node_by_path(self, path: str) -> Node:
        return self.folder_nodes_by_path[path]

    def get_nodes_by_label(self, label: str) -> set:
        return self.nodes_by_label[label]

    def get_node_by_id(self, id: str) -> Node:
        return self.__nodes[id]

    def get_relationships_as_objects(self) -> List[dict]:
        internal_relationships = [relationship.as_object() for relationship in self.get_relationships_from_nodes()]
        reference_relationships = [relationship.as_object() for relationship in self.__references_relationships]
        custom_relationships = [relationship.as_object() for relationship in self.__custom_relationships]

        return internal_relationships + reference_relationships + custom_relationships

    def get_relationships_from_nodes(self) -> List["Relationship"]:
        relationships = []
        for node in self.__nodes.values():
            relationships.extend(node.get_relationships())

        return relationships

    def add_references_relationships(self, references_relationships: List["Relationship"]) -> None:
        self.__references_relationships.extend(references_relationships)

    def get_nodes_as_objects(self) -> List[dict]:
        return [node.as_object() for node in self.__nodes.values()]

    def filtered_graph_by_paths(self, paths_to_keep: List[str]) -> "Graph":
        print("paths_to_keep", paths_to_keep)
        print("nodes", self.__nodes)
        print("references", self.__references_relationships)
        graph = Graph()
        for node in self.__nodes.values():
            if node.path in paths_to_keep:
                node.filter_children_by_path(paths_to_keep)
                graph.add_node(node)

        for relationship in self.__references_relationships:
            if relationship.start_node.path in paths_to_keep or relationship.end_node.path in paths_to_keep:
                graph.add_references_relationships([relationship])

        for relationship in self.__custom_relationships:
            if relationship.start_node.path in paths_to_keep or relationship.end_node.path in paths_to_keep:
                graph.add_custom_relationship(relationship.start_node, relationship.end_node, relationship.rel_type)
        print("filtered graph", graph)
        return graph

    def add_custom_relationship(self, start_node: Node, end_node: Node, relationship_type: "RelationshipType") -> None:
        relationship = Relationship(start_node, end_node, relationship_type)
        self.__custom_relationships.append(relationship)

    def __str__(self) -> str:
        to_return = ""

        for node in self.__nodes.values():
            to_return += f"{node}\n"

        for relationship in self.__references_relationships:
            to_return += f"{relationship}\n"

        return to_return
