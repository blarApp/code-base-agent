from Graph.Relationship import Relationship


class RelationshipFactory:
    def __init__(self, graph):
        self.graph = graph

    def create(self, start_node, end_node, type):
        return Relationship(self.graph, start_node, end_node, type)
