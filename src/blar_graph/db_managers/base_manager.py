class BaseDBManager:
    def save_graph(self):
        raise NotImplementedError("Subclasses must implement create_nodes method.")
