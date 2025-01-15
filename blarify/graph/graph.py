from collections import defaultdict
from blarify.graph.node import Node, NodeLabels
from blarify.graph.node import FileNode
from blarify.graph.node.types.definition_node import DefinitionNode
from blarify.graph.relationship import Relationship

from typing import List, Dict, Set, DefaultDict, Optional


class Graph:
    nodes_by_path: DefaultDict[str, Set[Node]]
    file_nodes_by_path: Dict[str, FileNode]
    folder_nodes_by_path: Dict[str, Node]
    nodes_by_label: DefaultDict[str, Set[Node]]
    __nodes: Dict[str, Node]
    __references_relationships: List["Relationship"]

    def __init__(self):
        self.__nodes = {}
        self.__references_relationships = []
        self.nodes_by_path = defaultdict(set)
        self.file_nodes_by_path = {}
        self.folder_nodes_by_path = {}
        self.nodes_by_label = defaultdict(set)
        self.nodes_by_relative_id = {}

    def has_folder_node_with_path(self, path: str) -> bool:
        return path in self.folder_nodes_by_path

    def add_nodes(self, nodes: List[Node]) -> None:
        for node in nodes:
            self.add_node(node)

    def add_node(self, node: Node) -> None:
        self.__nodes[node.id] = node
        self.nodes_by_path[node.path].add(node)
        self.nodes_by_label[node.label].add(node)
        self.nodes_by_relative_id[node.relative_id] = node

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

    def get_node_by_id(self, id: str) -> Optional[Node]:
        return self.__nodes.get(id)

    def get_node_by_relative_id(self, relative_id: str) -> Optional[Node]:
        return self.nodes_by_relative_id.get(relative_id)

    def get_relationships_as_objects(self) -> List[dict]:
        internal_relationships = [relationship.as_object() for relationship in self.get_relationships_from_nodes()]
        reference_relationships = [relationship.as_object() for relationship in self.__references_relationships]

        return internal_relationships + reference_relationships

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
        graph = Graph()
        for node in self.__nodes.values():
            if node.path in paths_to_keep:
                node.filter_children_by_path(paths_to_keep)
                graph.add_node(node)

        for relationship in self.__references_relationships:
            if relationship.start_node.path in paths_to_keep or relationship.end_node.path in paths_to_keep:
                graph.add_references_relationships([relationship])

        return graph

    def get_modified_nodes(self, updated_graph: "Graph") -> List[DefinitionNode]:
        """
        Returns a list of definition nodes that exist in both self and other graphs but have different code_text.
        """
        nodes_with_differences = []

        for node in self.__nodes.values():
            if isinstance(node, DefinitionNode) and updated_graph._contains_node(node):
                updated_node: DefinitionNode = updated_graph.get_node_by_id(node.id)

                print(
                    "Found node with differences",
                )

                if not node.are_code_texts_equivalent(updated_node):
                    nodes_with_differences.append(node)

        return nodes_with_differences

    def get_deleted_nodes(self, updated_graph: "Graph") -> List[Node]:
        return self._get_unique_nodes(updated_graph)

    def get_added_nodes(self, updated_graph: "Graph") -> List[Node]:
        return updated_graph._get_unique_nodes(self)

    def _get_unique_nodes(self, other: "Graph") -> List[Node]:
        """
        Returns nodes that exist in self but not in other
        """
        return [node for node in self.__nodes.values() if not other._contains_node(node)]

    def _contains_node(self, node: Node) -> bool:
        return self.get_node_by_id(node.id) is not None

    def __str__(self) -> str:
        to_return = ""

        for node in self.__nodes.values():
            to_return += f"{node}\n"

        for relationship in self.__references_relationships:
            to_return += f"{relationship}\n"

        return to_return
