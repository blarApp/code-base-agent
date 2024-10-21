class Graph:
    def __init__(self):
        self.nodes = {}
        self.relationships = {}

    def add_nodes(self, nodes):
        for node in nodes:
            self.add_node(node)

    def add_node(self, node):
        self.nodes[node.id] = node

    def add_relationships(self, relationships):
        for relationship in relationships:
            self.add_relationship(relationship)

    def add_relationship(self, relationship):
        self.relationships[relationship.id] = relationship

    def __str__(self):
        to_return = ""

        for node in self.nodes.values():
            to_return += f"{node}\n"

        for relationship in self.relationships.values():
            to_return += f"{relationship}\n"

        return to_return
