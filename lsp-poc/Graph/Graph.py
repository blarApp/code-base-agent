from collections import defaultdict
from .Node import Node, NodeLabels
from .Node import FileNode


class Graph:
    nodes_by_path: defaultdict
    file_nodes_by_path: defaultdict
    nodes_by_label: defaultdict
    nodes: dict
    references_relationships: list

    def __init__(self):
        self.nodes = {}
        self.nodes_by_path = defaultdict(set)
        self.file_nodes_by_path = defaultdict(lambda: None)
        self.nodes_by_label = defaultdict(set)
        self.references_relationships = []

    def has_node(self, node: Node) -> bool:
        return node.id in self.nodes

    def add_nodes(self, nodes):
        for node in nodes:
            self.add_node(node)

    def add_node(self, node):
        self.nodes[node.id] = node
        self.nodes_by_path[node.path].add(node)
        self.nodes_by_label[node.label].add(node)

        if node.label == NodeLabels.FILE:
            self.file_nodes_by_path[node.path] = node

    def get_nodes_by_path(self, path):
        return self.nodes_by_path[path]

    def get_file_node_by_path(self, path) -> FileNode:
        return self.file_nodes_by_path[path]

    def get_nodes_by_label(self, label):
        return self.nodes_by_label[label]

    def get_node_by_id(self, id):
        return self.nodes[id]

    def get_relationships_as_objects(self):
        internal_relationships = [relationship.as_object() for relationship in self.get_relationships()]
        reference_relationships = [relationship.as_object() for relationship in self.references_relationships]

        return internal_relationships + reference_relationships

    def get_relationships(self):
        relationships = []
        for node in self.nodes.values():
            relationships.extend(node.get_relationships())

        return relationships

    def add_references_relationships(self, references_relationships: list):
        self.references_relationships.extend(references_relationships)

    def get_nodes_as_objects(self):
        return [node.as_object() for node in self.nodes.values()]

    def __str__(self):
        to_return = ""

        for node in self.nodes.values():
            to_return += f"{node}\n"

        for relationship in self.relationships.values():
            to_return += f"{relationship}\n"

        return to_return
