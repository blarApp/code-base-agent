class AbstractDbManager:
    def close(self):
        """Close the connection to the database."""
        raise NotImplementedError

    def save_graph(self, nodes, edges):
        """Save nodes and edges to the database."""
        raise NotImplementedError

    def create_nodes(self, nodeList):
        """Create nodes in the database."""
        raise NotImplementedError

    def create_edges(self, edgesList):
        """Create edges between nodes in the database."""
        raise NotImplementedError

    def detatch_delete_nodes_with_path(self, path):
        """Detach and delete nodes matching the given path."""
        raise NotImplementedError
