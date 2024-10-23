class Graph:
    def __init__(self):
        self.nodes = {}
        self.relationships = {}

    def add_nodes(self, nodes):
        for node in nodes:
            self.add_node(node)

    def add_node(self, node):
        self.nodes[node.id] = node

    def get_nodes_by_path(self, path):
        return [node for node in self.nodes.values() if node.path == path]

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
