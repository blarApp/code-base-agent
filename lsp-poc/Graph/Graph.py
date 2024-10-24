from collections import defaultdict


class Graph:
    def __init__(self):
        self.nodes = {}
        self.relationships = {}

        self.nodes_by_path = defaultdict(set)
        self.nodes_by_label = defaultdict(set)

    def add_nodes(self, nodes):
        for node in nodes:
            self.add_node(node)

    def add_node(self, node):
        self.nodes[node.id] = node
        self.nodes_by_path[node.path].add(node)
        self.nodes_by_label[node.label].add(node)

    def get_nodes_by_path(self, path):
        return self.nodes_by_path[path]

    def get_nodes_by_label(self, label):
        return self.nodes_by_label[label]

    def add_relationships(self, relationships):
        for relationship in relationships:
            self.add_relationship(relationship)

    def add_relationship(self, relationship):
        self.relationships[relationship.id] = relationship

    def get_relationships_as_objects(self):
        return [
            relationship.as_object() for relationship in self.relationships.values()
        ]

    def get_nodes_as_objects(self):
        return [node.as_object() for node in self.nodes.values()]

    def __str__(self):
        to_return = ""

        for node in self.nodes.values():
            to_return += f"{node}\n"

        for relationship in self.relationships.values():
            to_return += f"{relationship}\n"

        return to_return
